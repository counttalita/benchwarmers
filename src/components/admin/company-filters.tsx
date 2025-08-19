"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CompanyFiltersProps {
  selectedStatus: string
  searchTerm: string
  selectedType: string
  domainVerified: string
  onStatusChange: (status: string) => void
  onSearchChange: (search: string) => void
  onTypeChange: (type: string) => void
  onDomainVerifiedChange: (verified: string) => void
  onClearFilters: () => void
}

export function CompanyFilters({
  selectedStatus,
  searchTerm,
  selectedType,
  domainVerified,
  onStatusChange,
  onSearchChange,
  onTypeChange,
  onDomainVerifiedChange,
  onClearFilters
}: CompanyFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(localSearch)
  }

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
  ]

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'provider', label: 'Provider' },
    { value: 'seeker', label: 'Seeker' },
    { value: 'both', label: 'Both' },
  ]

  const verificationOptions = [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <Label htmlFor="search">Search Companies</Label>
          <div className="flex space-x-2">
            <Input
              id="search"
              placeholder="Search by name or domain..."
              value={localSearch}
              onChange={(e: any) => setLocalSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option: any) => (
              <Button
                key={option.value}
                variant={selectedStatus === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Company Type Filter */}
        <div className="space-y-2">
          <Label>Company Type</Label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option: any) => (
              <Button
                key={option.value}
                variant={selectedType === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onTypeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Domain Verification Filter */}
        <div className="space-y-2">
          <Label>Domain Verification</Label>
          <div className="flex flex-wrap gap-2">
            {verificationOptions.map((option: any) => (
              <Button
                key={option.value}
                variant={domainVerified === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onDomainVerifiedChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="w-full"
        >
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  )
}