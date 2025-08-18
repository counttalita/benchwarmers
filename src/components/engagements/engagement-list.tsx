'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  UserCheck, UserX, Calendar, CheckCircle, AlertTriangle, 
  TrendingUp, Clock, DollarSign, MapPin, Eye, MessageCircle,
  FileText, ChevronDown, ChevronUp, Filter, SortAsc
} from 'lucide-react'

interface Engagement {
  id: string
  status: 'staged' | 'interviewing' | 'accepted' | 'rejected' | 'active' | 'completed' | 'terminated' | 'disputed'
  createdAt: string
  updatedAt: string
  talentRequest: {
    id: string
    title: string
    company: {
      id: string
      name: string
    }
  }
  talentProfile: {
    id: string
    name: string
    title: string
    company: {
      id: string
      name: string
    }
  }
  interviewDetails?: {
    interviewDate?: string
    interviewDuration?: number
    interviewerName?: string
    interviewType?: 'phone' | 'video' | 'in_person'
    interviewLocation?: string
    interviewNotes?: string
  }
  totalAmount?: number
  facilitationFee?: number
  netAmount?: number
}

interface EngagementListProps {
  engagements: Engagement[]
  userType: 'seeker' | 'provider' | 'admin'
  onStatusUpdate?: (engagementId: string, status: string, notes?: string) => void
  onViewDetails?: (engagementId: string) => void
  showFilters?: boolean
  showBulkActions?: boolean
  onBulkAction?: (engagementIds: string[], action: string) => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'staged': return 'bg-blue-100 text-blue-800'
    case 'interviewing': return 'bg-orange-100 text-orange-800'
    case 'accepted': return 'bg-green-100 text-green-800'
    case 'rejected': return 'bg-red-100 text-red-800'
    case 'active': return 'bg-purple-100 text-purple-800'
    case 'completed': return 'bg-gray-100 text-gray-800'
    case 'terminated': return 'bg-red-100 text-red-800'
    case 'disputed': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'staged': return <UserCheck className="h-4 w-4" />
    case 'interviewing': return <Calendar className="h-4 w-4" />
    case 'accepted': return <CheckCircle className="h-4 w-4" />
    case 'rejected': return <UserX className="h-4 w-4" />
    case 'active': return <TrendingUp className="h-4 w-4" />
    case 'completed': return <CheckCircle className="h-4 w-4" />
    case 'terminated': return <UserX className="h-4 w-4" />
    case 'disputed': return <AlertTriangle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'staged': return 'Shortlisted'
    case 'interviewing': return 'Interviewing'
    case 'accepted': return 'Accepted'
    case 'rejected': return 'Rejected'
    case 'active': return 'Active'
    case 'completed': return 'Completed'
    case 'terminated': return 'Terminated'
    case 'disputed': return 'Disputed'
    default: return status
  }
}

export default function EngagementList({
  engagements,
  userType,
  onStatusUpdate,
  onViewDetails,
  showFilters = true,
  showBulkActions = false,
  onBulkAction
}: EngagementListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'amount'>('date')
  const [expandedEngagement, setExpandedEngagement] = useState<string | null>(null)
  const [selectedEngagements, setSelectedEngagements] = useState<Set<string>>(new Set())

  const filteredEngagements = engagements.filter(engagement => {
    if (filterStatus === 'all') return true
    return engagement.status === filterStatus
  })

  const sortedEngagements = [...filteredEngagements].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'status':
        const statusOrder = ['staged', 'interviewing', 'accepted', 'active', 'completed', 'rejected', 'terminated', 'disputed']
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      case 'amount':
        return (b.totalAmount || 0) - (a.totalAmount || 0)
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
  })

  const toggleExpanded = (engagementId: string) => {
    setExpandedEngagement(expandedEngagement === engagementId ? null : engagementId)
  }

  const toggleSelectAll = () => {
    if (selectedEngagements.size === sortedEngagements.length) {
      setSelectedEngagements(new Set())
    } else {
      setSelectedEngagements(new Set(sortedEngagements.map(e => e.id)))
    }
  }

  const toggleSelectEngagement = (engagementId: string) => {
    const newSelected = new Set(selectedEngagements)
    if (newSelected.has(engagementId)) {
      newSelected.delete(engagementId)
    } else {
      newSelected.add(engagementId)
    }
    setSelectedEngagements(newSelected)
  }

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedEngagements.size > 0) {
      onBulkAction(Array.from(selectedEngagements), action)
      setSelectedEngagements(new Set())
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="staged">Shortlisted</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="accepted">Accepted</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="terminated">Terminated</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="date">Date Updated</option>
                  <option value="status">Status</option>
                  <option value="amount">Amount</option>
                </select>
              </div>

              <div className="ml-auto text-sm text-gray-500">
                Showing {sortedEngagements.length} of {engagements.length} engagements
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && selectedEngagements.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedEngagements.size} engagement(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Export
                </Button>
                {userType === 'admin' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('process_invoices')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Process Invoices
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Cards */}
      <div className="space-y-4">
        {sortedEngagements.map((engagement) => (
          <Card key={engagement.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(engagement.status)}`}>
                    {getStatusIcon(engagement.status)}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{engagement.talentRequest.title}</h3>
                        <Badge className={`${getStatusColor(engagement.status)} flex items-center gap-1`}>
                          {getStatusIcon(engagement.status)}
                          {getStatusLabel(engagement.status)}
                        </Badge>
                        {engagement.status === 'accepted' && (
                          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Invoice Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">
                        <span className="font-medium">{engagement.talentProfile.name}</span> • {engagement.talentProfile.title}
                        <span className="mx-2">→</span>
                        <span className="font-medium">{engagement.talentRequest.company.name}</span>
                      </p>
                    </div>

                    {showBulkActions && (
                      <input
                        type="checkbox"
                        checked={selectedEngagements.has(engagement.id)}
                        onChange={() => toggleSelectEngagement(engagement.id)}
                        className="rounded border-gray-300"
                      />
                    )}
                  </div>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Updated: {new Date(engagement.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {engagement.totalAmount && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>R{Number(engagement.totalAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {engagement.facilitationFee && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>Fee: R{Number(engagement.facilitationFee).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{engagement.talentProfile.company.name}</span>
                    </div>
                  </div>

                  {/* Interview Details */}
                  {engagement.interviewDetails && engagement.status === 'interviewing' && (
                    <div className="bg-orange-50 p-3 rounded-lg mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {engagement.interviewDetails.interviewDate && (
                          <div>
                            <span className="text-orange-700 font-medium">Date:</span>
                            <div>{new Date(engagement.interviewDetails.interviewDate).toLocaleDateString()}</div>
                          </div>
                        )}
                        {engagement.interviewDetails.interviewerName && (
                          <div>
                            <span className="text-orange-700 font-medium">Interviewer:</span>
                            <div>{engagement.interviewDetails.interviewerName}</div>
                          </div>
                        )}
                        {engagement.interviewDetails.interviewType && (
                          <div>
                            <span className="text-orange-700 font-medium">Type:</span>
                            <div className="capitalize">{engagement.interviewDetails.interviewType.replace('_', ' ')}</div>
                          </div>
                        )}
                        {engagement.interviewDetails.interviewDuration && (
                          <div>
                            <span className="text-orange-700 font-medium">Duration:</span>
                            <div>{engagement.interviewDetails.interviewDuration} min</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {onViewDetails && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDetails(engagement.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      )}
                      
                      {/* Status-specific actions */}
                      {engagement.status === 'staged' && onStatusUpdate && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(engagement.id, 'interviewing')}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule Interview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(engagement.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {engagement.status === 'interviewing' && onStatusUpdate && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(engagement.id, 'accepted')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(engagement.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {engagement.status === 'accepted' && userType === 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = '/admin/invoicing'}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Process Invoice
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(engagement.id)}
                    >
                      {expandedEngagement === engagement.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {expandedEngagement === engagement.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Interview Notes */}
                      {engagement.interviewDetails?.interviewNotes && (
                        <div>
                          <h4 className="font-medium mb-2">Interview Notes</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {engagement.interviewDetails.interviewNotes}
                          </p>
                        </div>
                      )}

                      {/* Financial Details */}
                      {engagement.totalAmount && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium mb-2">Financial Details</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Amount:</span>
                              <div className="font-medium">R{Number(engagement.totalAmount).toLocaleString()}</div>
                            </div>
                            {engagement.facilitationFee && (
                              <div>
                                <span className="text-gray-600">Platform Fee (5%):</span>
                                <div className="font-medium">R{Number(engagement.facilitationFee).toLocaleString()}</div>
                              </div>
                            )}
                            {engagement.netAmount && (
                              <div>
                                <span className="text-gray-600">Net Amount:</span>
                                <div className="font-medium">R{Number(engagement.netAmount).toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <h4 className="font-medium mb-2">Timeline</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Created: {new Date(engagement.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Updated: {new Date(engagement.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sortedEngagements.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No engagements found</h3>
            <p className="text-gray-600">
              {engagements.length === 0 
                ? "No engagements have been created yet."
                : "No engagements match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
