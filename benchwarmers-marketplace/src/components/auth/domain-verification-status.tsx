"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface DomainVerificationStatusProps {
  companyId: string
  companyName: string
  domain: string
  domainVerified: boolean
  onVerificationComplete?: () => void
}

export function DomainVerificationStatus({
  companyId,
  companyName,
  domain,
  domainVerified,
  onVerificationComplete
}: DomainVerificationStatusProps) {
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [lastSent, setLastSent] = useState<Date | null>(null)

  const handleResendVerification = async () => {
    try {
      setIsResending(true)
      setError(null)

      const response = await apiClient.post('/api/auth/send-domain-verification', {
        companyId
      })

      if (response.error) {
        throw response.error
      }

      setLastSent(new Date())
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'RESEND_FAILED',
        err instanceof Error ? err.message : 'Failed to resend verification email'
      )
      setError(appError)
    } finally {
      setIsResending(false)
    }
  }

  if (domainVerified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-green-800">Domain Verified</CardTitle>
              <CardDescription className="text-green-600">
                {domain} ownership confirmed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-700">
            <p>✅ Domain ownership verified</p>
            <p>⏳ Pending admin approval</p>
            <p>📱 You'll receive SMS notification when approved</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-yellow-800">Domain Verification Pending</CardTitle>
              <CardDescription className="text-yellow-600">
                Check your email to verify {domain}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-yellow-700">
          <p>📧 We've sent a verification email to your company email address</p>
          <p>🔗 Click the verification link in the email to confirm domain ownership</p>
          <p>⏰ The verification link expires in 24 hours</p>
        </div>

        {error && (
          <ErrorAlert
            error={error}
            onDismiss={() => setError(null)}
            onRetry={handleResendVerification}
          />
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-yellow-600">
            {lastSent && (
              <span>Verification email sent {lastSent.toLocaleTimeString()}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            {isResending ? "Sending..." : "Resend Email"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}