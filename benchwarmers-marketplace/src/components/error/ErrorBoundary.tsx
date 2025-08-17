'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AppError, createError, logError, ErrorSeverity } from '@/lib/errors'
import { ErrorFallback } from './ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  isolate?: boolean // Prevent error from bubbling up
}

interface State {
  hasError: boolean
  error: AppError | null
  errorInfo: ErrorInfo | null
}

export interface ErrorFallbackProps {
  error: AppError
  resetError: () => void
  retry?: () => void
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private readonly maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert any error to AppError
    const appError = error instanceof AppError 
      ? error 
      : createError.custom(
          'REACT_ERROR',
          error.message,
          'client' as any,
          ErrorSeverity.HIGH,
          { 
            cause: error,
            userMessage: 'Something went wrong. Please try refreshing the page.'
          }
        )

    return {
      hasError: true,
      error: appError,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = this.state.error || createError.custom(
      'REACT_ERROR',
      error.message,
      'client' as any,
      ErrorSeverity.HIGH,
      { cause: error }
    )

    // Log the error
    logError(appError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      retryCount: this.retryCount
    })

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }

    // Don't let error bubble up if isolate is true
    if (this.props.isolate) {
      return
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  retry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.resetError()
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          retry={this.retryCount < this.maxRetries ? this.retry : undefined}
        />
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary context
export function useErrorHandler() {
  return (error: Error | AppError, errorInfo?: any) => {
    const appError = error instanceof AppError 
      ? error 
      : createError.custom(
          'HOOK_ERROR',
          error.message,
          'client' as any,
          ErrorSeverity.MEDIUM,
          { cause: error }
        )

    logError(appError, errorInfo)
    throw appError // This will be caught by the nearest error boundary
  }
}
