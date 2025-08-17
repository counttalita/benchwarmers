'use client'

import React, { useState, useEffect } from 'react'
import { AppError, getUserMessage } from '@/lib/errors'
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorAlertProps {
  error: AppError
  onDismiss?: () => void
  onRetry?: () => void
  autoHide?: boolean
  autoHideDelay?: number
  className?: string
}

export function ErrorAlert({ 
  error, 
  onDismiss, 
  onRetry, 
  autoHide = false, 
  autoHideDelay = 5000,
  className = ''
}: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  const getAlertStyles = () => {
    switch (error.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getIcon = () => {
    switch (error.severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <AlertCircle className="w-5 h-5" />
      case 'low':
        return <Info className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getAlertStyles()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium">
            {error.severity === 'critical' ? 'Critical Error' : 
             error.severity === 'high' ? 'Error' : 
             error.severity === 'medium' ? 'Warning' : 'Notice'}
          </div>
          <div className="text-sm mt-1">
            {getUserMessage(error)}
          </div>
          
          {(onRetry || error.retryable) && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-current border-current hover:bg-current hover:bg-opacity-10"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Toast-style error notification
export function ErrorToast({ error, onDismiss, onRetry }: ErrorAlertProps) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <ErrorAlert
        error={error}
        onDismiss={onDismiss}
        onRetry={onRetry}
        autoHide={true}
        autoHideDelay={7000}
        className="shadow-lg"
      />
    </div>
  )
}

// Success notification for comparison
export function SuccessAlert({ 
  message, 
  onDismiss, 
  autoHide = true, 
  autoHideDelay = 3000 
}: {
  message: string
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 text-sm">{message}</div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-green-200 hover:bg-opacity-50 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
