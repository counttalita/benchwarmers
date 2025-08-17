'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Star, Eye, Heart, X, MessageCircle, Calendar, DollarSign, MapPin, 
  Clock, TrendingUp, AlertCircle, CheckCircle, Info, ChevronDown, 
  ChevronUp, Filter, SortAsc, Users, Award, Zap
} from 'lucide-react'

interface MatchBreakdown {
  skillsScore: number
  experienceScore: number
  availabilityScore: number
  budgetScore: number
  locationScore: number
  cultureScore: number
  velocityScore: number
  reliabilityScore: number
}

interface TalentMatch {
  id: string
  talentId: string
  talent: {
    id: string
    name: string
    title: string
    avatar?: string
    skills: Array<{
      name: string
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
      years: number
    }>
    rate: {
      min: number
      max: number
      currency: string
    }
    location: string
    timezone: string
    rating: number
    reviewCount: number
    completedProjects: number
    responseTime: string
    isVerified: boolean
    isPremium: boolean
  }
  score: number
  breakdown: MatchBreakdown
  reasons: string[]
  concerns: string[]
  rank: number
  confidence: number
  predictedSuccess: number
  status: 'pending' | 'viewed' | 'interested' | 'not_interested' | 'contacted' | 'hired'
  availabilityDetails?: {
    overlapPercentage: number
    availableHours: number
    conflictingBookings: number
    immediateAvailability: boolean
  }
  createdAt: string
  responseDeadline: string
}

interface MatchResultsProps {
  talentRequestId: string
  matches: TalentMatch[]
  onMatchAction: (matchId: string, action: 'view' | 'interested' | 'not_interested' | 'contact') => void
  onGenerateMore?: () => void
  isLoading?: boolean
}

const SCORE_COLORS = {
  excellent: 'text-green-600 bg-green-50',
  good: 'text-blue-600 bg-blue-50',
  fair: 'text-yellow-600 bg-yellow-50',
  poor: 'text-red-600 bg-red-50'
}

const getScoreColor = (score: number) => {
  if (score >= 80) return SCORE_COLORS.excellent
  if (score >= 60) return SCORE_COLORS.good
  if (score >= 40) return SCORE_COLORS.fair
  return SCORE_COLORS.poor
}

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Excellent Match'
  if (score >= 60) return 'Good Match'
  if (score >= 40) return 'Fair Match'
  return 'Poor Match'
}

export default function MatchResults({
  talentRequestId,
  matches,
  onMatchAction,
  onGenerateMore,
  isLoading = false
}: MatchResultsProps) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'availability' | 'rate' | 'experience'>('score')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showExplanations, setShowExplanations] = useState(false)

  const filteredMatches = matches.filter(match => {
    if (filterStatus === 'all') return true
    return match.status === filterStatus
  })

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score
      case 'availability':
        return (b.availabilityDetails?.overlapPercentage || 0) - (a.availabilityDetails?.overlapPercentage || 0)
      case 'rate':
        return a.talent.rate.min - b.talent.rate.min
      case 'experience':
        return b.talent.completedProjects - a.talent.completedProjects
      default:
        return b.score - a.score
    }
  })

  const handleMatchAction = (matchId: string, action: string) => {
    onMatchAction(matchId, action as any)
  }

  const toggleExpanded = (matchId: string) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId)
  }

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interested': return 'bg-green-100 text-green-800'
      case 'not_interested': return 'bg-red-100 text-red-800'
      case 'contacted': return 'bg-blue-100 text-blue-800'
      case 'hired': return 'bg-purple-100 text-purple-800'
      case 'viewed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16" />
                    <div className="h-6 bg-gray-200 rounded w-16" />
                    <div className="h-6 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Talent Matches</h2>
          <p className="text-muted-foreground">
            {matches.length} matches found • Sorted by {sortBy}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplanations(!showExplanations)}
          >
            <Info className="h-4 w-4 mr-1" />
            {showExplanations ? 'Hide' : 'Show'} Explanations
          </Button>
          {onGenerateMore && (
            <Button onClick={onGenerateMore}>
              <Zap className="h-4 w-4 mr-1" />
              Generate More
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Sorting */}
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
                <option value="pending">Pending</option>
                <option value="viewed">Viewed</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="score">Match Score</option>
                <option value="availability">Availability</option>
                <option value="rate">Hourly Rate</option>
                <option value="experience">Experience</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-500">
              Showing {sortedMatches.length} of {matches.length} matches
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Cards */}
      <div className="space-y-4">
        {sortedMatches.map((match) => (
          <Card key={match.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {match.talent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  {match.talent.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <Award className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{match.talent.name}</h3>
                        <Badge className={getStatusColor(match.status)}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                        {match.talent.isPremium && (
                          <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{match.talent.title}</p>
                    </div>

                    {/* Match Score */}
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.score)}`}>
                        <TrendingUp className="h-4 w-4" />
                        {Math.round(match.score)}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getScoreLabel(match.score)}
                      </p>
                    </div>
                  </div>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>${match.talent.rate.min}-{match.talent.rate.max}/hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{match.talent.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{match.talent.rating} ({match.talent.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{match.talent.responseTime}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {match.talent.skills.slice(0, 4).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                    {match.talent.skills.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{match.talent.skills.length - 4} more
                      </Badge>
                    )}
                  </div>

                  {/* Availability Info */}
                  {match.availabilityDetails && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-blue-700 font-medium">Availability:</span>
                          <div>{match.availabilityDetails.overlapPercentage}%</div>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Hours:</span>
                          <div>{match.availabilityDetails.availableHours}h</div>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Conflicts:</span>
                          <div>{match.availabilityDetails.conflictingBookings}</div>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Start:</span>
                          <div>{match.availabilityDetails.immediateAvailability ? 'Immediate' : 'Delayed'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Response Deadline */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      Response deadline: {formatTimeRemaining(match.responseDeadline)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rank #{match.rank} • {Math.round(match.confidence * 100)}% confidence
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMatchAction(match.id, 'view')}
                        disabled={match.status === 'viewed'}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMatchAction(match.id, 'interested')}
                        disabled={match.status === 'interested'}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Interested
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMatchAction(match.id, 'not_interested')}
                        disabled={match.status === 'not_interested'}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Pass
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMatchAction(match.id, 'contact')}
                        disabled={match.status === 'contacted'}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Contact
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(match.id)}
                    >
                      {expandedMatch === match.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {expandedMatch === match.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Score Breakdown */}
                      {showExplanations && (
                        <div>
                          <h4 className="font-medium mb-3">Score Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(match.breakdown).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <div className="flex justify-between">
                                  <span className="capitalize">{key.replace('Score', '')}:</span>
                                  <span className="font-medium">{Math.round(value)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${value}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reasons */}
                      {match.reasons.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Why This Match Works
                          </h4>
                          <ul className="space-y-1">
                            {match.reasons.map((reason, index) => (
                              <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                                <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Concerns */}
                      {match.concerns.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            Potential Concerns
                          </h4>
                          <ul className="space-y-1">
                            {match.concerns.map((concern, index) => (
                              <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                                <span className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0" />
                                {concern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Success Prediction */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Predicted Success Rate:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round(match.predictedSuccess * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${match.predictedSuccess * 100}%` }}
                          />
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
      {sortedMatches.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matches found</h3>
            <p className="text-gray-600 mb-4">
              {matches.length === 0 
                ? "We haven't found any matches yet. Try adjusting your requirements."
                : "No matches match your current filters."
              }
            </p>
            {onGenerateMore && (
              <Button onClick={onGenerateMore}>
                <Zap className="h-4 w-4 mr-2" />
                Generate More Matches
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
