'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Lock, Unlock, Star, MapPin, Clock, DollarSign, Mail, Phone, Globe, Github, Linkedin, Calendar, Award, Briefcase } from 'lucide-react'
import EngagementStatusActions from './engagement-status-actions'

interface TalentProfile {
  id: string
  name: string
  title: string
  bio: string
  location: string
  timezone: string
  avatar?: string
  skills: Array<{
    name: string
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    years: number
  }>
  experience: Array<{
    company: string
    role: string
    duration: string
    description: string
  }>
  rate: {
    min: number
    max: number
    currency: string
  }
  availability: {
    status: 'available' | 'busy' | 'unavailable'
    hoursPerWeek: number
  }
  rating: number
  reviewCount: number
  completedProjects: number
  responseTime: string
  languages: string[]
  links: {
    portfolio?: string
    linkedin?: string
    github?: string
  }
  isVerified: boolean
  isPremium: boolean
}

interface ProfilePreviewProps {
  profile: TalentProfile
  viewerIsPremium?: boolean
  showBlurred?: boolean
  onUpgrade?: () => void
}

export default function ProfilePreview({
  profile,
  viewerIsPremium = false,
  showBlurred = false,
  onUpgrade
}: ProfilePreviewProps) {
  const [previewMode, setPreviewMode] = useState<'full' | 'blurred' | 'watermark'>('full')

  const shouldBlur = showBlurred && !viewerIsPremium
  const canViewFull = viewerIsPremium || !showBlurred

  const getSkillColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-800'
      case 'advanced': return 'bg-blue-100 text-blue-800'
      case 'intermediate': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const BlurOverlay = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    if (!shouldBlur) return <>{children}</>
    
    return (
      <div className={`relative ${className}`}>
        <div className={previewMode === 'blurred' ? 'filter blur-sm' : ''}>
          {children}
        </div>
        {previewMode !== 'full' && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-700 mb-1">Premium Content</p>
              <p className="text-sm text-gray-500 mb-3">Upgrade to view full details</p>
              <Button size="sm" onClick={onUpgrade}>
                Upgrade Now
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const WatermarkOverlay = ({ children }: { children: React.ReactNode }) => {
    if (!shouldBlur || previewMode === 'full') return <>{children}</>
    
    return (
      <div className="relative">
        {children}
        {previewMode === 'watermark' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 bg-black/10 text-white px-2 py-1 text-xs font-medium rounded transform rotate-12">
              PREMIUM
            </div>
            <div className="absolute bottom-4 left-4 bg-black/10 text-white px-2 py-1 text-xs font-medium rounded transform -rotate-12">
              UPGRADE TO VIEW
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview Mode Controls (for demo purposes) */}
      {showBlurred && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Preview Mode</h3>
                <p className="text-sm text-blue-700">See how your profile appears to different user types</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={previewMode === 'full' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('full')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Full View
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'blurred' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('blurred')}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Blurred
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'watermark' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('watermark')}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Watermark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <WatermarkOverlay>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </div>
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <Award className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  {profile.isPremium && (
                    <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                  )}
                  {profile.isVerified && (
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  )}
                </div>
                
                <p className="text-lg text-gray-600 mb-3">{profile.title}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {profile.timezone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {profile.rating} ({profile.reviewCount} reviews)
                  </div>
                </div>
                
                <BlurOverlay>
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </BlurOverlay>
              </div>
              
              <div className="text-right">
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(profile.availability.status)}`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                  {profile.availability.status}
                </div>
                <BlurOverlay className="mt-2">
                  <div className="text-2xl font-bold text-green-600">
                    ${profile.rate.min}-{profile.rate.max}
                  </div>
                  <div className="text-sm text-gray-500">per hour</div>
                </BlurOverlay>
              </div>
            </div>
          </CardContent>
        </Card>
      </WatermarkOverlay>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <BlurOverlay>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      className={getSkillColor(skill.level)}
                    >
                      {skill.name} • {skill.years}y • {skill.level}
                    </Badge>
                  ))}
                </div>
              </BlurOverlay>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BlurOverlay>
                <div className="space-y-4">
                  {profile.experience.map((exp, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4">
                      <h3 className="font-semibold">{exp.role}</h3>
                      <p className="text-gray-600">{exp.company} • {exp.duration}</p>
                      <p className="text-sm text-gray-500 mt-1">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </BlurOverlay>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((language, index) => (
                  <Badge key={index} variant="outline">
                    {language}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Projects Completed</span>
                <span className="font-semibold">{profile.completedProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Response Time</span>
                <span className="font-semibold">{profile.responseTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Availability</span>
                <span className="font-semibold">{profile.availability.hoursPerWeek}h/week</span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Links</CardTitle>
            </CardHeader>
            <CardContent>
              <BlurOverlay>
                <div className="space-y-3">
                  {profile.links.portfolio && (
                    <a
                      href={profile.links.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Globe className="h-4 w-4" />
                      Portfolio
                    </a>
                  )}
                  {profile.links.linkedin && (
                    <a
                      href={profile.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {profile.links.github && (
                    <a
                      href={profile.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </BlurOverlay>
            </CardContent>
          </Card>

          {/* Engagement Status Actions */}
          <EngagementStatusActions
            talentProfileId={profile.id}
            requestId="sample-request-id" // TODO: Pass actual request ID
            currentStatus={null} // TODO: Pass actual engagement status
            onStatusChange={(newStatus: any) => {
              console.log('Status changed to:', newStatus)
            }}
          />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button className="w-full" size="lg">
              <Mail className="h-4 w-4 mr-2" />
              Contact Talent
            </Button>
            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
            {!canViewFull && (
              <Button variant="outline" className="w-full" onClick={onUpgrade}>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Full Profile
              </Button>
            )}
          </div>

          {/* Premium Upgrade Prompt */}
          {!viewerIsPremium && showBlurred && (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold text-purple-900 mb-1">Premium Access</h3>
                <p className="text-sm text-purple-700 mb-3">
                  Unlock full profiles, contact details, and advanced search filters
                </p>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={onUpgrade}>
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
