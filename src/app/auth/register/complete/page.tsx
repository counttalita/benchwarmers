"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DomainVerificationStatus } from "@/components/auth/domain-verification-status"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface Company {
  id: string
  name: string
  domain: string
  type: string
  status: string
  domainVerified: boolean
  domainVerifiedAt: string | null
}

export default function RegistrationCompletePage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const companyId = searchParams.get('companyId')

  useEffect(() => {
    if (!companyId) {
      router.push('/auth/register')
      return
    }

    loadCompanyStatus()
  }, [companyId, router])

  const loadCompanyStatus = async () => {
    if (!companyId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get(`/api/companies/${companyId}/status`)

      if (response.error) {
        throw response.error
      }

      if (response.data?.company) {
        setCompany(response.data.company)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'LOAD_COMPANY_FAILED',
        err instanceof Error ? err.message : 'Failed to load company status'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationComplete = () => {
    // Reload company status when verification is complete
    loadCompanyStatus()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading registration status...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Registration Error</CardTitle>
              <CardDescription>
                There was a problem loading your registration status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
              <Button
                onClick={() => router.push('/auth/register')}
                className="w-full"
              >
                Back to Registration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Registration Status</h1>
          <p className="text-muted-foreground">
            Track your company registration progress
          </p>
        </div>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Your registered company details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Company Name:</span>
                <div className="mt-1">{company.name}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Domain:</span>
                <div className="mt-1">{company.domain}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Company Type:</span>
                <div className="mt-1 capitalize">{company.type}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <div className="mt-1 capitalize">{company.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Verification Status */}
        <DomainVerificationStatus
          companyId={company.id}
          companyName={company.name}
          domain={company.domain}
          domainVerified={company.domainVerified}
          onVerificationComplete={handleVerificationComplete}
        />

        {/* Registration Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Steps</CardTitle>
            <CardDescription>
              Complete these steps to activate your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
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
                  <div className="font-medium">Company Registration</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  company.domainVerified 
                    ? 'bg-green-100' 
                    : 'bg-yellow-100'
                }`}>
                  {company.domainVerified ? (
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
                  ) : (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium">Domain Verification</div>
                  <div className="text-sm text-gray-600">
                    {company.domainVerified ? 'Completed' : 'Pending'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  company.status === 'active' 
                    ? 'bg-green-100' 
                    : company.domainVerified 
                      ? 'bg-yellow-100' 
                      : 'bg-gray-100'
                }`}>
                  {company.status === 'active' ? (
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
                  ) : company.domainVerified ? (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium">Admin Approval</div>
                  <div className="text-sm text-gray-600">
                    {company.status === 'active' 
                      ? 'Approved' 
                      : company.domainVerified 
                        ? 'Pending Review' 
                        : 'Waiting for Domain Verification'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {company.status === 'active' ? (
            <Button
              onClick={() => router.push('/auth/login')}
              className="flex-1"
            >
              Continue to Login
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="flex-1"
            >
              Go to Login
            </Button>
          )}
          <Button
            variant="outline"
            onClick={loadCompanyStatus}
            className="flex-1"
          >
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  )
}