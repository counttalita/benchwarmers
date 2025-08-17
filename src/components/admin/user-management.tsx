"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Users, UserPlus, Shield, Mail, Phone, MoreVertical, Edit, Trash2, UserCheck } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'provider' | 'seeker' | 'admin'
  status: 'active' | 'inactive' | 'suspended'
  companyId?: string
  companyName?: string
  isEmailVerified: boolean
  is2FAEnabled: boolean
  lastLoginAt?: string
  createdAt: string
}

interface UserManagementProps {
  companyId?: string
  isAdminView?: boolean
}

export function UserManagement({ companyId, isAdminView = false }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'seeker' | 'admin'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [companyId, filter, roleFilter])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        ...(companyId && { companyId }),
        ...(filter !== 'all' && { status: filter }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const endpoint = isAdminView ? '/api/admin/users' : '/api/companies/users'
      const response = await apiClient.get(`${endpoint}?${queryParams.toString()}`)
      
      if (response.error) {
        throw response.error
      }

      if (response.data?.users) {
        setUsers(response.data.users)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'LOAD_USERS_FAILED',
        err instanceof Error ? err.message : 'Failed to load users'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return variants[status as keyof typeof variants] || variants.inactive
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800',
      seeker: 'bg-blue-100 text-blue-800',
      provider: 'bg-orange-100 text-orange-800'
    }
    return variants[role as keyof typeof variants] || variants.provider
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h2>
          <p className="text-muted-foreground">
            {isAdminView ? 'Manage all platform users' : 'Manage users within your company'}
          </p>
        </div>
        {!isAdminView && (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="seeker">Seeker</SelectItem>
                  {isAdminView && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <ErrorAlert 
          error={error} 
          onDismiss={() => setError(null)}
          onRetry={loadUsers}
        />
      )}

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                No users found matching your criteria.
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}
                      {user.companyName && (
                        <div className="text-sm text-muted-foreground">
                          Company: {user.companyName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleBadge(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge className={getStatusBadge(user.status)}>
                      {user.status}
                    </Badge>
                    {user.is2FAEnabled && (
                      <Badge variant="outline">
                        <Shield className="h-3 w-3 mr-1" />
                        2FA
                      </Badge>
                    )}
                    {!user.isEmailVerified && (
                      <Badge variant="destructive">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'provider').length}
                </div>
                <div className="text-sm text-muted-foreground">Providers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {users.filter(u => u.role === 'seeker').length}
                </div>
                <div className="text-sm text-muted-foreground">Seekers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.is2FAEnabled).length}
                </div>
                <div className="text-sm text-muted-foreground">2FA Enabled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
