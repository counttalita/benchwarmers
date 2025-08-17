'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AppError, getUserMessage } from '@/lib/errors'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

export interface ErrorFallbackProps {
  error: AppError
  resetError: () => void
  retry?: () => void
}

export function ErrorFallback({ error, resetError, retry }: ErrorFallbackProps) {
  const userMessage = getUserMessage(error)
  const isDevelopment = process.env.NODE_ENV === 'development'

  const handleReportError = () => {
    // In a real app, this would send error report to your error tracking service
    const errorReport = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.log('Error Report:', errorReport)
    // Example: sendErrorReport(errorReport)
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600">
            {userMessage}
          </p>
        </div>

        {/* Development Info */}
        {isDevelopment && (
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <div className="font-semibold text-gray-700 mb-2">Development Info:</div>
            <div className="space-y-1 text-gray-600">
              <div><strong>Code:</strong> {error.code}</div>
              <div><strong>Category:</strong> {error.category}</div>
              <div><strong>Severity:</strong> {error.severity}</div>
              <div><strong>Message:</strong> {error.message}</div>
              {error.context && (
                <div>
                  <strong>Context:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {retry && (
            <Button onClick={retry} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          
          <Button variant="outline" onClick={resetError} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>

          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </Button>

          <Button variant="ghost" onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        {/* Report Error */}
        <div className="pt-4 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReportError}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <Bug className="w-4 h-4" />
            Report this error
          </Button>
        </div>
      </div>
    </div>
  )
}

// Minimal error fallback for critical areas
export function MinimalErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">Error occurred</span>
      </div>
      <p className="text-red-700 text-sm mt-1">
        {getUserMessage(error)}
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={resetError}
        className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
      >
        Try again
      </Button>
    </div>
  )
}

// Loading error fallback
export function LoadingErrorFallback({ error, resetError, retry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-orange-600" />
      </div>
      <div className="text-center">
        <h3 className="font-medium text-gray-900">Failed to load</h3>
        <p className="text-sm text-gray-600 mt-1">
          {getUserMessage(error)}
        </p>
      </div>
      <div className="flex gap-2">
        {retry && (
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={resetError}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
