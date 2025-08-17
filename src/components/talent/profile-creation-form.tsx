'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Upload, MapPin, Clock, DollarSign } from 'lucide-react'

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['junior', 'mid', 'senior', 'expert']),
  yearsExperience: z.number().min(0).max(50)
})

const experienceSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  company: z.string().min(1, 'Company is required'),
  duration: z.number().min(1, 'Duration is required'),
  industry: z.string().min(1, 'Industry is required'),
  description: z.string().optional()
})

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000),
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  location: z.string().min(2, 'Location is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite']),
  rateMin: z.number().min(10, 'Minimum rate must be at least $10'),
  rateMax: z.number().min(10, 'Maximum rate must be at least $10'),
  rateCurrency: z.string().default('USD'),
  skills: z.array(skillSchema).min(3, 'At least 3 skills are required'),
  experience: z.array(experienceSchema).min(1, 'At least 1 experience entry is required'),
  languages: z.array(z.string()).min(1, 'At least 1 language is required'),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal(''))
})

type ProfileFormData = z.infer<typeof profileSchema>

const SKILL_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid (2-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'expert', label: 'Expert (8+ years)' }
]

const SENIORITY_LEVELS = [
  { value: 'junior', label: 'Junior Developer' },
  { value: 'mid', label: 'Mid-Level Developer' },
  { value: 'senior', label: 'Senior Developer' },
  { value: 'lead', label: 'Lead Developer' },
  { value: 'principal', label: 'Principal Developer' }
]

const REMOTE_PREFERENCES = [
  { value: 'remote', label: 'Remote Only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site Only' }
]

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' }
]

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
  'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Vue.js', 'Angular', 'Svelte',
  'Next.js', 'Nuxt.js', 'Express.js', 'Django', 'Flask', 'Spring Boot',
  'Laravel', 'Ruby on Rails', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'GraphQL', 'REST APIs'
]

export default function ProfileCreationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSkill, setCurrentSkill] = useState({ name: '', level: 'mid' as const, yearsExperience: 1 })
  const [currentExperience, setCurrentExperience] = useState({
    role: '', company: '', duration: 12, industry: '', description: ''
  })
  const [currentLanguage, setCurrentLanguage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      skills: [],
      experience: [],
      languages: [],
      rateCurrency: 'USD',
      remotePreference: 'remote',
      seniorityLevel: 'mid'
    }
  })

  const watchedSkills = watch('skills') || []
  const watchedExperience = watch('experience') || []
  const watchedLanguages = watch('languages') || []
  const watchedRateMin = watch('rateMin')
  const watchedRateMax = watch('rateMax')

  const addSkill = () => {
    if (currentSkill.name.trim()) {
      const newSkills = [...watchedSkills, { ...currentSkill, yearsExperience: Number(currentSkill.yearsExperience) }]
      setValue('skills', newSkills)
      setCurrentSkill({ name: '', level: 'mid', yearsExperience: 1 })
    }
  }

  const removeSkill = (index: number) => {
    const newSkills = watchedSkills.filter((_, i) => i !== index)
    setValue('skills', newSkills)
  }

  const addExperience = () => {
    if (currentExperience.role.trim() && currentExperience.company.trim()) {
      const newExperience = [...watchedExperience, { ...currentExperience, duration: Number(currentExperience.duration) }]
      setValue('experience', newExperience)
      setCurrentExperience({ role: '', company: '', duration: 12, industry: '', description: '' })
    }
  }

  const removeExperience = (index: number) => {
    const newExperience = watchedExperience.filter((_, i) => i !== index)
    setValue('experience', newExperience)
  }

  const addLanguage = () => {
    if (currentLanguage.trim() && !watchedLanguages.includes(currentLanguage)) {
      setValue('languages', [...watchedLanguages, currentLanguage])
      setCurrentLanguage('')
    }
  }

  const removeLanguage = (index: number) => {
    const newLanguages = watchedLanguages.filter((_, i) => i !== index)
    setValue('languages', newLanguages)
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      // Validate rate range
      if (data.rateMax < data.rateMin) {
        throw new Error('Maximum rate must be greater than minimum rate')
      }

      const response = await fetch('/api/talent/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create profile')
      }

      const result = await response.json()
      console.log('Profile created:', result)
      
      // Redirect to profile page or show success message
      window.location.href = `/talent/profiles/${result.profile.id}`
    } catch (error) {
      console.error('Error creating profile:', error)
      // Show error message to user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create Your Talent Profile</h1>
        <p className="text-muted-foreground mt-2">
          Build a comprehensive profile to showcase your skills and attract opportunities
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about yourself and your professional background</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="title">Professional Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Senior Full-Stack Developer"
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Describe your experience, expertise, and what makes you unique..."
                rows={4}
              />
              {errors.bio && <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>}
            </div>

            <div>
              <Label htmlFor="seniorityLevel">Seniority Level</Label>
              <Select onValueChange={(value) => setValue('seniorityLevel', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your seniority level" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.seniorityLevel && <p className="text-sm text-red-500 mt-1">{errors.seniorityLevel.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Location & Work Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Work Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="San Francisco, CA"
                />
                {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>}
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  {...register('timezone')}
                  placeholder="America/Los_Angeles"
                />
                {errors.timezone && <p className="text-sm text-red-500 mt-1">{errors.timezone.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="remotePreference">Remote Work Preference</Label>
              <Select onValueChange={(value) => setValue('remotePreference', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your remote work preference" />
                </SelectTrigger>
                <SelectContent>
                  {REMOTE_PREFERENCES.map((pref) => (
                    <SelectItem key={pref.value} value={pref.value}>
                      {pref.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.remotePreference && <p className="text-sm text-red-500 mt-1">{errors.remotePreference.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Rate Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rate Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rateMin">Minimum Rate (per hour)</Label>
                <Input
                  id="rateMin"
                  type="number"
                  {...register('rateMin', { valueAsNumber: true })}
                  placeholder="50"
                />
                {errors.rateMin && <p className="text-sm text-red-500 mt-1">{errors.rateMin.message}</p>}
              </div>
              <div>
                <Label htmlFor="rateMax">Maximum Rate (per hour)</Label>
                <Input
                  id="rateMax"
                  type="number"
                  {...register('rateMax', { valueAsNumber: true })}
                  placeholder="150"
                />
                {errors.rateMax && <p className="text-sm text-red-500 mt-1">{errors.rateMax.message}</p>}
                {watchedRateMin && watchedRateMax && watchedRateMax < watchedRateMin && (
                  <p className="text-sm text-red-500 mt-1">Maximum rate must be greater than minimum rate</p>
                )}
              </div>
              <div>
                <Label htmlFor="rateCurrency">Currency</Label>
                <Select onValueChange={(value) => setValue('rateCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
            <CardDescription>Add your technical skills and experience levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="skillName">Skill Name</Label>
                <Input
                  id="skillName"
                  value={currentSkill.name}
                  onChange={(e) => setCurrentSkill({ ...currentSkill, name: e.target.value })}
                  placeholder="e.g., React, Python, AWS"
                  list="common-skills"
                />
                <datalist id="common-skills">
                  {COMMON_SKILLS.map((skill) => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="skillLevel">Level</Label>
                <Select value={currentSkill.level} onValueChange={(value) => setCurrentSkill({ ...currentSkill, level: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="skillYears">Years</Label>
                <Input
                  id="skillYears"
                  type="number"
                  min="0"
                  max="50"
                  value={currentSkill.yearsExperience}
                  onChange={(e) => setCurrentSkill({ ...currentSkill, yearsExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button type="button" onClick={addSkill} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>

            {watchedSkills.length > 0 && (
              <div className="space-y-2">
                <Label>Added Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {watchedSkills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      {skill.name} ({skill.level}, {skill.yearsExperience}y)
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {errors.skills && <p className="text-sm text-red-500">{errors.skills.message}</p>}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
            <CardDescription>Add your relevant work experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expRole">Role</Label>
                <Input
                  id="expRole"
                  value={currentExperience.role}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, role: e.target.value })}
                  placeholder="Senior Developer"
                />
              </div>
              <div>
                <Label htmlFor="expCompany">Company</Label>
                <Input
                  id="expCompany"
                  value={currentExperience.company}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, company: e.target.value })}
                  placeholder="TechCorp Inc"
                />
              </div>
              <div>
                <Label htmlFor="expDuration">Duration (months)</Label>
                <Input
                  id="expDuration"
                  type="number"
                  min="1"
                  value={currentExperience.duration}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, duration: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="expIndustry">Industry</Label>
                <Input
                  id="expIndustry"
                  value={currentExperience.industry}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, industry: e.target.value })}
                  placeholder="fintech, e-commerce, healthcare"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expDescription">Description (optional)</Label>
              <Textarea
                id="expDescription"
                value={currentExperience.description}
                onChange={(e) => setCurrentExperience({ ...currentExperience, description: e.target.value })}
                placeholder="Describe your key achievements and responsibilities..."
                rows={3}
              />
            </div>
            <Button type="button" onClick={addExperience} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Experience
            </Button>

            {watchedExperience.length > 0 && (
              <div className="space-y-2">
                <Label>Added Experience</Label>
                <div className="space-y-2">
                  {watchedExperience.map((exp, index) => (
                    <div key={index} className="p-3 border rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-medium">{exp.role} at {exp.company}</p>
                        <p className="text-sm text-muted-foreground">
                          {exp.duration} months • {exp.industry}
                        </p>
                        {exp.description && (
                          <p className="text-sm mt-1">{exp.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {errors.experience && <p className="text-sm text-red-500">{errors.experience.message}</p>}
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <CardDescription>What languages do you speak?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value)}
                placeholder="e.g., English, Spanish, French"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              />
              <Button type="button" onClick={addLanguage}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {watchedLanguages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedLanguages.map((language, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-2">
                    {language}
                    <button
                      type="button"
                      onClick={() => removeLanguage(index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {errors.languages && <p className="text-sm text-red-500">{errors.languages.message}</p>}
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Links (Optional)</CardTitle>
            <CardDescription>Add links to your professional profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="portfolioUrl">Portfolio URL</Label>
              <Input
                id="portfolioUrl"
                {...register('portfolioUrl')}
                placeholder="https://yourportfolio.com"
              />
              {errors.portfolioUrl && <p className="text-sm text-red-500 mt-1">{errors.portfolioUrl.message}</p>}
            </div>
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                {...register('linkedinUrl')}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.linkedinUrl && <p className="text-sm text-red-500 mt-1">{errors.linkedinUrl.message}</p>}
            </div>
            <div>
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                {...register('githubUrl')}
                placeholder="https://github.com/yourusername"
              />
              {errors.githubUrl && <p className="text-sm text-red-500 mt-1">{errors.githubUrl.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => reset()}>
            Reset Form
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Profile...' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
