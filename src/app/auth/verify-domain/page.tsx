"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface Company {
  id: string
  name: string
  domain: string
  domainVerified: boolean
  domainVerifiedAt: string | null
  status: string
}

export default function VerifyDomainPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError(createError.validation('MISSING_TOKEN', 'Verification token is required'))
      setIsLoading(false)
      return
    }

    checkVerificationStatus()
  }, [token])

  const checkVerificationStatus = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const response = await apiClient.get(`/api/auth/verify-domain?token=${token}`)

      if (response.error) {
        throw response.error
      }

      if (response.data?.company) {
        setCompany(response.data.company)

        // If already verified, show success state
        if (response.data.company.domainVerified) {
          setSuccess(true)
        }
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'VERIFICATION_CHECK_FAILED',
        err instanceof Error ? err.message : 'Failed to check verification status'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!token) return

    try {
      setIsVerifying(true)
      setError(null)

      const response = await apiClient.post('/api/auth/verify-domain', { token })

      if (response.error) {
        throw response.error
      }

      if (response.data?.company) {
        setCompany(response.data.company)
        setSuccess(true)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'VERIFICATION_FAILED',
        err instanceof Error ? err.message : 'Domain verification failed'
      )
      setError(appError)
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Checking verification status...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Verification Error</CardTitle>
              <CardDescription>
                There was a problem with your domain verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ErrorAlert error={error} onDismiss={() => setError(null)} />
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success && company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <CardTitle className="text-center text-green-600">Domain Verified!</CardTitle>
              <CardDescription className="text-center">
                Your company domain has been successfully verified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Company:</span>
                  <span>{company.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Domain:</span>
                  <span>{company.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className="capitalize">{company.status}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>✅ Domain ownership verified</p>
                <p>⏳ Pending admin approval</p>
                <p>📱 You'll receive an SMS when your account is approved</p>
              </div>

              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Continue to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Verify Domain Ownership</CardTitle>
            <CardDescription>
              Confirm that you own this domain to complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {company && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Company:</span>
                  <span>{company.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Domain:</span>
                  <span>{company.domain}</span>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p>By clicking "Verify Domain", you confirm that:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You have access to email at this domain</li>
                <li>You are authorized to register this company</li>
                <li>The information provided is accurate</li>
              </ul>
            </div>

            {error && (
              <ErrorAlert
                error={error}
                onDismiss={() => setError(null)}
                onRetry={handleVerifyDomain}
              />
            )}

            <Button
              onClick={handleVerifyDomain}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? "Verifying..." : "Verify Domain"}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}