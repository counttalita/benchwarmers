'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  BookmarkPlus, 
  MessageCircle, 
  CheckCircle, 
  Clock,
  Loader2,
  AlertCircle 
} from 'lucide-react'
// import { toast } from 'sonner'

// Temporary toast replacement until sonner is installed
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message)
}

interface EngagementStatusActionsProps {
  talentProfileId: string
  requestId: string
  currentStatus?: 'staged' | 'interviewing' | 'accepted' | 'rejected' | null
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
}

export default function EngagementStatusActions({
  talentProfileId,
  requestId,
  currentStatus = null,
  onStatusChange,
  disabled = false
}: EngagementStatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [engagementId, setEngagementId] = useState<string | null>(null)

  const updateEngagementStatus = async (newStatus: 'staged' | 'interviewing' | 'accepted' | 'rejected') => {
    setLoading(newStatus)
    
    try {
      // First, create engagement if it doesn't exist
      if (!engagementId && !currentStatus) {
        const createResponse = await fetch('/api/engagements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            talentProfileId,
            status: newStatus
          })
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create engagement')
        }

        const { engagement } = await createResponse.json()
        setEngagementId(engagement.id)
        
        toast.success(getStatusMessage(newStatus))
        onStatusChange?.(newStatus)
        return
      }

      // Update existing engagement status via interview workflow endpoint
      const updateResponse = await fetch(`/api/engagements/${engagementId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update engagement status')
      }

      toast.success(getStatusMessage(newStatus))
      onStatusChange?.(newStatus)

      // Special handling for "accepted" status
      if (newStatus === 'accepted') {
        toast.success('🎉 Talent accepted! Email notifications sent to all stakeholders.')
      }

    } catch (error) {
      console.error('Error updating engagement status:', error)
      toast.error('Failed to update status. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'staged': return 'Talent shortlisted successfully!'
      case 'interviewing': return 'Interview process started'
      case 'accepted': return 'Talent signed and accepted!'
      case 'rejected': return 'Talent declined'
      default: return 'Status updated'
    }
  }

  const getStatusBadge = () => {
    if (!currentStatus) return null

    const statusConfig = {
      staged: { label: 'Shortlisted', color: 'bg-blue-100 text-blue-800', icon: BookmarkPlus },
      interviewing: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: MessageCircle },
      accepted: { label: 'Signed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }

    const config = statusConfig[currentStatus]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const isCurrentStatus = (status: string) => currentStatus === status
  const isLoading = (status: string) => loading === status

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Engagement Status</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          {/* Stage/Shortlist Button */}
          <Button
            variant={isCurrentStatus('staged') ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => updateEngagementStatus('staged')}
            disabled={disabled || isLoading('staged') || isCurrentStatus('staged')}
          >
            {isLoading('staged') ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BookmarkPlus className="h-4 w-4 mr-2" />
            )}
            {isCurrentStatus('staged') ? 'Shortlisted' : 'Shortlist Talent'}
          </Button>

          {/* Interview/In Progress Button */}
          <Button
            variant={isCurrentStatus('interviewing') ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => updateEngagementStatus('interviewing')}
            disabled={disabled || isLoading('interviewing') || isCurrentStatus('interviewing') || (!currentStatus && !isCurrentStatus('staged'))}
          >
            {isLoading('interviewing') ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            {isCurrentStatus('interviewing') ? 'In Progress' : 'Start Interview'}
          </Button>

          {/* Accept/Sign Button */}
          <Button
            variant={isCurrentStatus('accepted') ? 'default' : 'outline'}
            className={`w-full justify-start ${
              isCurrentStatus('accepted') 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
            onClick={() => updateEngagementStatus('accepted')}
            disabled={disabled || isLoading('accepted') || isCurrentStatus('accepted') || (!currentStatus && !isCurrentStatus('interviewing'))}
          >
            {isLoading('accepted') ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isCurrentStatus('accepted') ? 'Signed & Accepted' : 'Accept & Sign'}
          </Button>

          {/* Workflow Info */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Workflow:</span>
            </div>
            <div className="mt-1 text-xs text-blue-600">
              Shortlist → Interview → Sign & Accept
            </div>
            {currentStatus === 'accepted' && (
              <div className="mt-2 text-xs text-green-700 font-medium">
                ✓ Email notifications sent to all stakeholders
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
