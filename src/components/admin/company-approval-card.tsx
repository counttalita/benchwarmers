"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  createdAt: string
  users: Array<{
    id: string
    name: string
    email: string | null
    phoneNumber: string
    phoneVerified: boolean
    createdAt: string
  }>
}

interface CompanyApprovalCardProps {
  company: Company
  onActionComplete: () => void
}

export function CompanyApprovalCard({ company, onActionComplete }: CompanyApprovalCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleCompanyAction = async (action: 'approve' | 'reject', reason?: string) => {
    try {
      setActionLoading(action)
      setError(null)

      const response = await apiClient.post('/api/admin/companies', {
        companyId: company.id,
        action,
        rejectionReason: reason,
        notes: `${action === 'approve' ? 'Approved' : 'Rejected'} by admin on ${new Date().toISOString()}`
      })
      
      if (response.error) {
        throw response.error
      }

      // Reset form state
      setShowRejectForm(false)
      setRejectionReason("")
      
      // Notify parent component
      onActionComplete()
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'COMPANY_ACTION_FAILED',
        err instanceof Error ? err.message : `Failed to ${action} company`
      )
      setError(appError)
    } finally {
      setActionLoading(null)
    }
  }


  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setError(createError.validation('REJECTION_REASON_REQUIRED', 'Please provide a rejection reason'))
      return
    }
    handleCompanyAction('reject', rejectionReason)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      active: "default",
      suspended: "destructive",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      provider: "bg-blue-100 text-blue-800",
      seeker: "bg-green-100 text-green-800",
      both: "bg-purple-100 text-purple-800",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
        {type}
      </span>
    )
  }

  const adminUser = company.users.find(user => user.email) || company.users[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{company.name}</span>
              {getStatusBadge(company.status)}
              {getTypeBadge(company.type)}
            </CardTitle>
            <CardDescription>
              {company.domain} • Registered {new Date(company.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {company.domainVerified ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                ✓ Domain Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                ⏳ Domain Pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Company Type:</span>
            <div className="mt-1">{getTypeBadge(company.type)}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Domain Status:</span>
            <div className="mt-1">
              {company.domainVerified ? (
                <span className="text-green-600">✓ Verified {company.domainVerifiedAt && `on ${new Date(company.domainVerifiedAt).toLocaleDateString()}`}</span>
              ) : (
                <span className="text-yellow-600">⏳ Pending verification</span>
              )}
            </div>
          </div>
        </div>

        {/* Admin Contact Info */}
        {adminUser && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-gray-800">Primary Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-600">Name:</span>
                <div>{adminUser.name}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Phone:</span>
                <div className="flex items-center space-x-2">
                  <span>{adminUser.phoneNumber}</span>
                  {adminUser.phoneVerified && (
                    <Badge variant="default" className="text-xs">Verified</Badge>
                  )}
                </div>
              </div>
              {adminUser.email && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-600">Email:</span>
                  <div>{adminUser.email}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <ErrorAlert 
            error={error} 
            onDismiss={() => setError(null)}
            onRetry={() => {
              if (showRejectForm) {
                handleReject()
              }
            }}
          />
        )}

        {/* Action Buttons for Pending Companies */}
        {company.status === 'pending' && company.domainVerified && (
          <div className="space-y-3">
            {!showRejectForm ? (
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleCompanyAction('approve')}
                  disabled={actionLoading !== null}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {actionLoading === 'approve' ? "Approving..." : "✓ Approve Company"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading !== null}
                  className="flex-1"
                >
                  ✗ Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <Label htmlFor="rejectionReason" className="text-red-800 font-medium">
                    Rejection Reason
                  </Label>
                  <Input
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejection..."
                    className="mt-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={actionLoading !== null || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    {actionLoading === 'reject' ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectionReason("")
                      setError(null)
                    }}
                    disabled={actionLoading !== null}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Domain Verification Notice */}
        {company.status === 'pending' && !company.domainVerified && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
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
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  Waiting for domain verification
                </p>
                <p className="text-sm text-yellow-700">
                  Company will be available for approval once domain ownership is verified.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}