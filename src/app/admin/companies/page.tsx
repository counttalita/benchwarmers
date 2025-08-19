"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"
import { CompanyApprovalCard } from "@/components/admin/company-approval-card"
import { CompanyFilters } from "@/components/admin/company-filters"
import { CompanyStats } from "@/components/admin/company-stats"

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

interface CompaniesResponse {
  companies: Company[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [domainVerified, setDomainVerified] = useState('all')

  useEffect(() => {
    loadCompanies()
  }, [selectedStatus, searchTerm, selectedType, domainVerified, pagination.page])

  const loadCompanies = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        status: selectedStatus,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedType !== 'all' && { type: selectedType }),
        ...(domainVerified !== 'all' && { domainVerified: domainVerified === 'verified' ? 'true' : 'false' }),
      })

      const response = await apiClient.get(`/api/admin/companies?${queryParams.toString()}`)
      
      if (response.error) {
        throw response.error
      }

      if (response.data) {
        const data = response.data as CompaniesResponse
        setCompanies(data.companies)
        setPagination(data.pagination)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'LOAD_COMPANIES_FAILED',
        err instanceof Error ? err.message : 'Failed to load companies'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearFilters = () => {
    setSelectedStatus('pending')
    setSearchTerm('')
    setSelectedType('all')
    setDomainVerified('all')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  if (isLoading && companies.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading companies...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground">Review and approve company registrations</p>
        </div>
      </div>

      {/* Company Statistics */}
      <CompanyStats />

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CompanyFilters
            selectedStatus={selectedStatus}
            searchTerm={searchTerm}
            selectedType={selectedType}
            domainVerified={domainVerified}
            onStatusChange={(status: any) => {
              setSelectedStatus(status)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onSearchChange={(search: any) => {
              setSearchTerm(search)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onTypeChange={(type: any) => {
              setSelectedType(type)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onDomainVerifiedChange={(verified: any) => {
              setDomainVerified(verified)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            onClearFilters={handleClearFilters}
          />
        </div>

        <div className="lg:col-span-3 space-y-4">

          {error && (
            <ErrorAlert 
              error={error} 
              onDismiss={() => setError(null)}
              onRetry={loadCompanies}
            />
          )}

          {/* Companies List */}
          <div className="space-y-4">
        {companies.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                No {selectedStatus} companies found.
              </div>
            </CardContent>
          </Card>
        ) : (
          companies.map((company: any) => (
            <CompanyApprovalCard
              key={company.id}
              company={company}
              onActionComplete={loadCompanies}
            />
          ))
          )}
          </div>

          {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}