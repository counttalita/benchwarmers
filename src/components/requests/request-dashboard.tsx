'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, Filter, Plus, Eye, Edit, Trash2, Clock, DollarSign, Users, 
  MapPin, Calendar, AlertCircle, CheckCircle, XCircle, Pause
} from 'lucide-react'

interface TalentRequest {
  id: string
  title: string
  description: string
  projectType: 'short-term' | 'long-term' | 'contract' | 'full-time'
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'open' | 'in-progress' | 'paused' | 'completed' | 'cancelled'
  requiredSkills: Array<{
    name: string
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    priority: 'required' | 'preferred' | 'nice-to-have'
  }>
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal'
  teamSize: number
  startDate: string
  endDate?: string
  hoursPerWeek: number
  budget: {
    type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'fixed'
    min: number
    max: number
    currency: string
  }
  location?: string
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'flexible'
  createdAt: string
  updatedAt: string
  matchCount: number
  responseCount: number
  company: {
    id: string
    name: string
    logo?: string
  }
}

const SAMPLE_REQUESTS: TalentRequest[] = [
  {
    id: '1',
    title: 'Senior React Developer for E-commerce Platform',
    description: 'We need an experienced React developer to help build our next-generation e-commerce platform...',
    projectType: 'contract',
    urgency: 'high',
    status: 'open',
    requiredSkills: [
      { name: 'React', level: 'expert', priority: 'required' },
      { name: 'TypeScript', level: 'advanced', priority: 'required' },
      { name: 'Node.js', level: 'intermediate', priority: 'preferred' }
    ],
    seniorityLevel: 'senior',
    teamSize: 1,
    startDate: '2024-09-01',
    endDate: '2024-12-01',
    hoursPerWeek: 40,
    budget: { type: 'hourly', min: 80, max: 120, currency: 'USD' },
    remotePreference: 'remote',
    createdAt: '2024-08-15T10:00:00Z',
    updatedAt: '2024-08-15T10:00:00Z',
    matchCount: 12,
    responseCount: 8,
    company: { id: '1', name: 'TechCorp Inc.' }
  },
  {
    id: '2',
    title: 'DevOps Engineer for Cloud Migration',
    description: 'Looking for a DevOps specialist to help migrate our infrastructure to AWS...',
    projectType: 'short-term',
    urgency: 'urgent',
    status: 'in-progress',
    requiredSkills: [
      { name: 'AWS', level: 'expert', priority: 'required' },
      { name: 'Kubernetes', level: 'advanced', priority: 'required' },
      { name: 'Terraform', level: 'intermediate', priority: 'preferred' }
    ],
    seniorityLevel: 'senior',
    teamSize: 2,
    startDate: '2024-08-20',
    endDate: '2024-10-20',
    hoursPerWeek: 40,
    budget: { type: 'hourly', min: 90, max: 140, currency: 'USD' },
    remotePreference: 'flexible',
    createdAt: '2024-08-10T14:30:00Z',
    updatedAt: '2024-08-16T09:15:00Z',
    matchCount: 8,
    responseCount: 5,
    company: { id: '2', name: 'CloudStart LLC' }
  },
  {
    id: '3',
    title: 'UI/UX Designer for Mobile App',
    description: 'Seeking a creative UI/UX designer to redesign our mobile application...',
    projectType: 'long-term',
    urgency: 'medium',
    status: 'draft',
    requiredSkills: [
      { name: 'Figma', level: 'expert', priority: 'required' },
      { name: 'Mobile Design', level: 'advanced', priority: 'required' },
      { name: 'User Research', level: 'intermediate', priority: 'preferred' }
    ],
    seniorityLevel: 'mid',
    teamSize: 1,
    startDate: '2024-09-15',
    hoursPerWeek: 30,
    budget: { type: 'hourly', min: 60, max: 90, currency: 'USD' },
    remotePreference: 'remote',
    createdAt: '2024-08-17T11:20:00Z',
    updatedAt: '2024-08-17T11:20:00Z',
    matchCount: 0,
    responseCount: 0,
    company: { id: '3', name: 'MobileFirst Co.' }
  }
]

export default function RequestDashboard() {
  const [requests, setRequests] = useState<TalentRequest[]>(SAMPLE_REQUESTS)
  const [filteredRequests, setFilteredRequests] = useState<TalentRequest[]>(SAMPLE_REQUESTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    filterRequests()
  }, [searchTerm, statusFilter, urgencyFilter, projectTypeFilter, requests])

  const filterRequests = () => {
    let filtered = requests

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchLower) ||
        request.description.toLowerCase().includes(searchLower) ||
        request.requiredSkills.some(skill => skill.name.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter)
    }

    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(request => request.urgency === urgencyFilter)
    }

    // Project type filter
    if (projectTypeFilter !== 'all') {
      filtered = filtered.filter(request => request.projectType === projectTypeFilter)
    }

    setFilteredRequests(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'paused': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-4 w-4" />
      case 'open': return <Eye className="h-4 w-4" />
      case 'in-progress': return <Clock className="h-4 w-4" />
      case 'paused': return <Pause className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProjectDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.round(diffDays / 30)} months`
    return `${Math.round(diffDays / 365)} years`
  }

  const handleDeleteRequest = (requestId: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      setRequests(prev => prev.filter(req => req.id !== requestId))
    }
  }

  const handleStatusChange = (requestId: string, newStatus: string) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: newStatus as any, updatedAt: new Date().toISOString() }
        : req
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Talent Requests</h1>
          <p className="text-muted-foreground">
            Manage your talent requests and track matching progress
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Requests</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'open').length}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">
                  {requests.reduce((sum: any, r: any) => sum + r.matchCount, 0)}
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Responses</p>
                <p className="text-2xl font-bold">
                  {requests.reduce((sum: any, r: any) => sum + r.responseCount, 0)}
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests by title, description, or skills..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="short-term">Short-term</SelectItem>
                <SelectItem value="long-term">Long-term</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="full-time">Full-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request: any) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status}</span>
                    </Badge>
                    <Badge className={getUrgencyColor(request.urgency)}>
                      {request.urgency.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {request.requiredSkills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill.name} ({skill.level})
                      </Badge>
                    ))}
                    {request.requiredSkills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{request.requiredSkills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteRequest(request.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(request.startDate)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{getProjectDuration(request.startDate, request.endDate)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>${request.budget.min}-{request.budget.max}/{request.budget.type}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{request.teamSize} person{request.teamSize !== 1 ? 's' : ''}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="capitalize">{request.remotePreference}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span>{request.matchCount} matches, {request.responseCount} responses</span>
                </div>
              </div>

              {request.status === 'open' && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Last updated: {formatDate(request.updatedAt)}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusChange(request.id, 'paused')}
                      >
                        Pause
                      </Button>
                      <Button size="sm">
                        View Matches ({request.matchCount})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-gray-600 mb-4">
              {requests.length === 0 
                ? "You haven't created any talent requests yet."
                : "No requests match your current filters."
              }
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Request
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
