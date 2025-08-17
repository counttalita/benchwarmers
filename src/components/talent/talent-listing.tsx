'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, MapPin, Clock, DollarSign, Star, Eye, Users, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'

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
  isVerified: boolean
  isPremium: boolean
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal'
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'flexible'
}

interface FilterState {
  search: string
  skills: string[]
  location: string
  minRate: number
  maxRate: number
  availability: string
  seniorityLevel: string
  remotePreference: string
  rating: number
  verified: boolean
  premium: boolean
}

interface TalentListingProps {
  initialProfiles?: TalentProfile[]
  onProfileSelect?: (profile: TalentProfile) => void
  viewerIsPremium?: boolean
}

const SAMPLE_PROFILES: TalentProfile[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Senior Full-Stack Developer',
    bio: 'Experienced developer specializing in React, Node.js, and cloud architecture. Passionate about building scalable applications.',
    location: 'San Francisco, CA',
    timezone: 'PST',
    skills: [
      { name: 'React', level: 'expert', years: 5 },
      { name: 'Node.js', level: 'advanced', years: 4 },
      { name: 'TypeScript', level: 'advanced', years: 3 },
      { name: 'AWS', level: 'intermediate', years: 2 }
    ],
    rate: { min: 80, max: 120, currency: 'USD' },
    availability: { status: 'available', hoursPerWeek: 40 },
    rating: 4.9,
    reviewCount: 47,
    completedProjects: 23,
    responseTime: '< 2 hours',
    languages: ['English', 'Mandarin'],
    isVerified: true,
    isPremium: true,
    seniorityLevel: 'senior',
    remotePreference: 'remote'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    title: 'DevOps Engineer',
    bio: 'Cloud infrastructure specialist with expertise in Kubernetes, Docker, and CI/CD pipelines.',
    location: 'Austin, TX',
    timezone: 'CST',
    skills: [
      { name: 'Kubernetes', level: 'expert', years: 4 },
      { name: 'Docker', level: 'expert', years: 5 },
      { name: 'AWS', level: 'advanced', years: 6 },
      { name: 'Terraform', level: 'advanced', years: 3 }
    ],
    rate: { min: 90, max: 140, currency: 'USD' },
    availability: { status: 'busy', hoursPerWeek: 20 },
    rating: 4.8,
    reviewCount: 32,
    completedProjects: 18,
    responseTime: '< 4 hours',
    languages: ['English', 'Spanish'],
    isVerified: true,
    isPremium: false,
    seniorityLevel: 'senior',
    remotePreference: 'flexible'
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    title: 'UI/UX Designer',
    bio: 'Creative designer focused on user-centered design and modern interfaces. 8+ years of experience.',
    location: 'Barcelona, Spain',
    timezone: 'CET',
    skills: [
      { name: 'Figma', level: 'expert', years: 4 },
      { name: 'Adobe Creative Suite', level: 'expert', years: 8 },
      { name: 'Prototyping', level: 'advanced', years: 5 },
      { name: 'User Research', level: 'advanced', years: 3 }
    ],
    rate: { min: 60, max: 90, currency: 'USD' },
    availability: { status: 'available', hoursPerWeek: 30 },
    rating: 4.7,
    reviewCount: 28,
    completedProjects: 15,
    responseTime: '< 6 hours',
    languages: ['English', 'Spanish', 'Catalan'],
    isVerified: false,
    isPremium: true,
    seniorityLevel: 'senior',
    remotePreference: 'remote'
  }
]

const SKILL_OPTIONS = [
  'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'AWS', 'Docker', 'Kubernetes',
  'Figma', 'Adobe Creative Suite', 'Vue.js', 'Angular', 'Go', 'Rust', 'PostgreSQL', 'MongoDB'
]

export default function TalentListing({
  initialProfiles = SAMPLE_PROFILES,
  onProfileSelect,
  viewerIsPremium = false
}: TalentListingProps) {
  const [profiles, setProfiles] = useState<TalentProfile[]>(initialProfiles)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'availability' | 'experience'>('rating')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    skills: [],
    location: '',
    minRate: 0,
    maxRate: 200,
    availability: '',
    seniorityLevel: '',
    remotePreference: '',
    rating: 0,
    verified: false,
    premium: false
  })

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addSkillFilter = (skill: string) => {
    if (!filters.skills.includes(skill)) {
      updateFilter('skills', [...filters.skills, skill])
    }
  }

  const removeSkillFilter = (skill: string) => {
    updateFilter('skills', filters.skills.filter(s => s !== skill))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      skills: [],
      location: '',
      minRate: 0,
      maxRate: 200,
      availability: '',
      seniorityLevel: '',
      remotePreference: '',
      rating: 0,
      verified: false,
      premium: false
    })
  }

  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = profiles.filter(profile => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          profile.name.toLowerCase().includes(searchLower) ||
          profile.title.toLowerCase().includes(searchLower) ||
          profile.bio.toLowerCase().includes(searchLower) ||
          profile.skills.some(skill => skill.name.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
      }

      // Skills filter
      if (filters.skills.length > 0) {
        const hasRequiredSkills = filters.skills.every(requiredSkill =>
          profile.skills.some(skill => skill.name === requiredSkill)
        )
        if (!hasRequiredSkills) return false
      }

      // Location filter
      if (filters.location && !profile.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false
      }

      // Rate filter
      if (profile.rate.max < filters.minRate || profile.rate.min > filters.maxRate) {
        return false
      }

      // Availability filter
      if (filters.availability && profile.availability.status !== filters.availability) {
        return false
      }

      // Seniority filter
      if (filters.seniorityLevel && profile.seniorityLevel !== filters.seniorityLevel) {
        return false
      }

      // Remote preference filter
      if (filters.remotePreference && profile.remotePreference !== filters.remotePreference) {
        return false
      }

      // Rating filter
      if (filters.rating > 0 && profile.rating < filters.rating) {
        return false
      }

      // Verified filter
      if (filters.verified && !profile.isVerified) {
        return false
      }

      // Premium filter
      if (filters.premium && !profile.isPremium) {
        return false
      }

      return true
    })

    // Sort profiles
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'rate':
          comparison = a.rate.min - b.rate.min
          break
        case 'availability':
          const availabilityOrder = { available: 3, busy: 2, unavailable: 1 }
          comparison = availabilityOrder[a.availability.status] - availabilityOrder[b.availability.status]
          break
        case 'experience':
          comparison = a.completedProjects - b.completedProjects
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [profiles, filters, sortBy, sortOrder])

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

  const activeFilterCount = Object.values(filters).filter(value => {
    if (typeof value === 'string') return value !== ''
    if (typeof value === 'boolean') return value
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'number') return value > 0
    return false
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Find Talent</h1>
          <p className="text-muted-foreground">
            Discover and connect with top professionals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="rate">Rate</SelectItem>
              <SelectItem value="availability">Availability</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, title, skills, or keywords..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 pr-4 py-3 text-lg"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Skills Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Skills</Label>
                <Select onValueChange={addSkillFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_OPTIONS.filter(skill => !filters.skills.includes(skill)).map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                        <button
                          onClick={() => removeSkillFilter(skill)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Location</Label>
                <Input
                  placeholder="City, Country"
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                />
              </div>

              {/* Rate Range */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Hourly Rate ($)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minRate || ''}
                    onChange={(e) => updateFilter('minRate', Number(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxRate || ''}
                    onChange={(e) => updateFilter('maxRate', Number(e.target.value) || 200)}
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Availability</Label>
                <Select value={filters.availability} onValueChange={(value) => updateFilter('availability', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seniority Level */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Seniority</Label>
                <Select value={filters.seniorityLevel} onValueChange={(value) => updateFilter('seniorityLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid-level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remote Preference */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Work Style</Label>
                <Select value={filters.remotePreference} onValueChange={(value) => updateFilter('remotePreference', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Minimum Rating */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Min Rating</Label>
                <Select value={filters.rating.toString()} onValueChange={(value) => updateFilter('rating', Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verification Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={filters.verified}
                  onChange={(e) => updateFilter('verified', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="verified" className="text-sm">Verified only</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {filteredAndSortedProfiles.length} talent{filteredAndSortedProfiles.length !== 1 ? 's' : ''} found
        </p>
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Talent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAndSortedProfiles.map((profile) => (
          <Card key={profile.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  {profile.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <Star className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{profile.name}</h3>
                    {profile.isPremium && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">Premium</Badge>
                    )}
                    {profile.isVerified && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-2">{profile.title}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {profile.rating} ({profile.reviewCount})
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getAvailabilityColor(profile.availability.status)}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {profile.availability.status}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{profile.bio}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {profile.skills.slice(0, 4).map((skill, index) => (
                      <Badge key={index} className={`text-xs ${getSkillColor(skill.level)}`}>
                        {skill.name}
                      </Badge>
                    ))}
                    {profile.skills.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.skills.length - 4} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-green-600">
                      ${profile.rate.min}-{profile.rate.max}/hr
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onProfileSelect?.(profile)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                      <Button size="sm">
                        Contact
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedProfiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No talent found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search terms to find more results.
            </p>
            <Button onClick={clearFilters}>Clear All Filters</Button>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {filteredAndSortedProfiles.length > 0 && (
        <div className="text-center">
          <Button variant="outline" disabled={loading}>
            {loading ? 'Loading...' : 'Load More Talent'}
          </Button>
        </div>
      )}
    </div>
  )
}
