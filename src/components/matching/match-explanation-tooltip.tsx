'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Info, X, TrendingUp, Star, Clock, DollarSign, MapPin, 
  Users, Zap, Shield, Award, AlertTriangle, CheckCircle2
} from 'lucide-react'

interface ScoreBreakdown {
  skillsScore: number
  experienceScore: number
  availabilityScore: number
  budgetScore: number
  locationScore: number
  cultureScore: number
  velocityScore: number
  reliabilityScore: number
}

interface MatchExplanationTooltipProps {
  isOpen: boolean
  onClose: () => void
  matchScore: number
  breakdown: ScoreBreakdown
  reasons: string[]
  concerns: string[]
  confidence: number
  predictedSuccess: number
  talentName: string
  position?: { x: number; y: number }
}

const SCORE_WEIGHTS = {
  skills: 30,
  experience: 20,
  availability: 15,
  budget: 15,
  location: 10,
  culture: 5,
  velocity: 3,
  reliability: 2
}

const SCORE_DESCRIPTIONS = {
  skillsScore: {
    icon: Zap,
    title: 'Skills Match',
    description: 'How well the talent\'s skills align with your requirements',
    weight: SCORE_WEIGHTS.skills
  },
  experienceScore: {
    icon: Award,
    title: 'Experience Level',
    description: 'Years of experience and industry background relevance',
    weight: SCORE_WEIGHTS.experience
  },
  availabilityScore: {
    icon: Clock,
    title: 'Availability',
    description: 'Timeline compatibility and capacity for your project',
    weight: SCORE_WEIGHTS.availability
  },
  budgetScore: {
    icon: DollarSign,
    title: 'Budget Fit',
    description: 'How well their rate aligns with your budget range',
    weight: SCORE_WEIGHTS.budget
  },
  locationScore: {
    icon: MapPin,
    title: 'Location & Timezone',
    description: 'Geographic and timezone compatibility for collaboration',
    weight: SCORE_WEIGHTS.location
  },
  cultureScore: {
    icon: Users,
    title: 'Culture Fit',
    description: 'Company size, industry, and working style alignment',
    weight: SCORE_WEIGHTS.culture
  },
  velocityScore: {
    icon: TrendingUp,
    title: 'Delivery Speed',
    description: 'Historical performance and delivery velocity',
    weight: SCORE_WEIGHTS.velocity
  },
  reliabilityScore: {
    icon: Shield,
    title: 'Reliability',
    description: 'Track record of successful project completion',
    weight: SCORE_WEIGHTS.reliability
  }
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
  if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

const getScoreGrade = (score: number) => {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  return 'D'
}

export default function MatchExplanationTooltip({
  isOpen,
  onClose,
  matchScore,
  breakdown,
  reasons,
  concerns,
  confidence,
  predictedSuccess,
  talentName,
  position
}: MatchExplanationTooltipProps) {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'reasons' | 'concerns'>('breakdown')

  if (!isOpen) return null

  const sortedBreakdown = Object.entries(breakdown)
    .map(([key, value]) => ({
      key: key as keyof ScoreBreakdown,
      value,
      ...SCORE_DESCRIPTIONS[key as keyof ScoreBreakdown]
    }))
    .sort((a, b) => b.weight - a.weight)

  const tooltipStyle = position ? {
    position: 'fixed' as const,
    top: position.y + 10,
    left: position.x - 200,
    zIndex: 1000,
    maxWidth: '400px'
  } : {
    position: 'relative' as const,
    maxWidth: '400px'
  }

  return (
    <div style={tooltipStyle}>
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Match Explanation
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Why {talentName} is a {getScoreGrade(matchScore)} match
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className={`p-4 rounded-lg border ${getScoreColor(matchScore)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Overall Match Score</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{Math.round(matchScore)}%</span>
                <Badge variant="outline" className="font-bold">
                  {getScoreGrade(matchScore)}
                </Badge>
              </div>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div
                className="bg-current h-2 rounded-full transition-all duration-300"
                style={{ width: `${matchScore}%` }}
              />
            </div>
          </div>

          {/* Confidence & Success Prediction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Confidence</div>
              <div className="text-lg font-bold text-blue-600">
                {Math.round(confidence * 100)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Success Rate</div>
              <div className="text-lg font-bold text-green-600">
                {Math.round(predictedSuccess * 100)}%
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: 'breakdown', label: 'Score Breakdown', count: Object.keys(breakdown).length },
              { key: 'reasons', label: 'Strengths', count: reasons.length },
              { key: 'concerns', label: 'Concerns', count: concerns.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'breakdown' && (
              <div className="space-y-3">
                {sortedBreakdown.map(({ key, value, icon: Icon, title, description, weight }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{title}</span>
                        <Badge variant="outline" className="text-xs">
                          {weight}%
                        </Badge>
                      </div>
                      <span className="text-sm font-bold">
                        {Math.round(value)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          value >= 80 ? 'bg-green-500' :
                          value >= 60 ? 'bg-blue-500' :
                          value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reasons' && (
              <div className="space-y-3">
                {reasons.length > 0 ? (
                  reasons.map((reason, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-green-800">{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No specific strengths identified</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'concerns' && (
              <div className="space-y-3">
                {concerns.length > 0 ? (
                  concerns.map((concern, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-orange-800">{concern}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No major concerns identified</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Algorithm Info */}
          <div className="pt-3 border-t">
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <Info className="h-3 w-3" />
                How is this score calculated?
              </summary>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Our matching algorithm uses weighted scoring across 8 key factors:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Skills (30%) - Technical skill alignment</li>
                  <li>Experience (20%) - Years and industry relevance</li>
                  <li>Availability (15%) - Timeline and capacity fit</li>
                  <li>Budget (15%) - Rate compatibility</li>
                  <li>Location (10%) - Timezone and remote preferences</li>
                  <li>Culture (5%) - Company and work style fit</li>
                  <li>Velocity (3%) - Historical delivery speed</li>
                  <li>Reliability (2%) - Past performance track record</li>
                </ul>
                <p className="pt-1">
                  Scores are normalized to 0-100% and weighted to produce the final match score.
                </p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
