'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar, Clock, DollarSign, Users, Plus, X, AlertCircle, CheckCircle, MapPin, Briefcase } from 'lucide-react'

const talentRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  projectType: z.enum(['short-term', 'long-term', 'contract', 'full-time']),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  
  // Skills and requirements
  requiredSkills: z.array(z.object({
    name: z.string().min(1, 'Skill name is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    priority: z.enum(['required', 'preferred', 'nice-to-have'])
  })).min(1, 'At least one skill is required'),
  
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  teamSize: z.number().min(1).max(50),
  
  // Timeline and availability
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  duration: z.object({
    value: z.number().min(1),
    unit: z.enum(['days', 'weeks', 'months'])
  }),
  hoursPerWeek: z.number().min(1).max(168),
  timezone: z.string().min(1, 'Timezone is required'),
  
  // Budget and compensation
  budget: z.object({
    type: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'fixed']),
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD')
  }).refine(data => data.max >= data.min, {
    message: 'Maximum budget must be greater than or equal to minimum'
  }),
  
  // Location and remote preferences
  location: z.string().optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'flexible']),
  
  // Additional requirements
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  industryExperience: z.array(z.string()).optional(),
  
  // Communication and process
  communicationStyle: z.enum(['formal', 'casual', 'collaborative', 'independent']),
  meetingFrequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'as-needed']),
  reportingStructure: z.string().optional(),
  
  // Special requirements
  backgroundCheck: z.boolean().default(false),
  nda: z.boolean().default(false),
  clientFacing: z.boolean().default(false),
  
  // Matching preferences
  autoMatch: z.boolean().default(true),
  maxMatches: z.number().min(1).max(20).default(10),
  responseTimeRequirement: z.enum(['immediate', '2-hours', '24-hours', '48-hours'])
})

type TalentRequestForm = z.infer<typeof talentRequestSchema>

const SKILL_OPTIONS = [
  'React', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'AWS', 'Docker', 'Kubernetes',
  'Figma', 'Adobe Creative Suite', 'Vue.js', 'Angular', 'Go', 'Rust', 'PostgreSQL', 'MongoDB',
  'DevOps', 'Machine Learning', 'Data Science', 'UI/UX Design', 'Product Management'
]

const TIMEZONE_OPTIONS = [
  'UTC', 'EST', 'PST', 'CST', 'MST', 'GMT', 'CET', 'JST', 'AEST', 'IST'
]

const INDUSTRY_OPTIONS = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education', 'Media', 'Gaming',
  'Fintech', 'SaaS', 'Enterprise', 'Startup', 'Government', 'Non-profit'
]

export default function TalentRequestForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<TalentRequestForm>({
    resolver: zodResolver(talentRequestSchema),
    defaultValues: {
      projectType: 'contract',
      urgency: 'medium',
      seniorityLevel: 'mid',
      teamSize: 1,
      duration: { value: 3, unit: 'months' },
      hoursPerWeek: 40,
      timezone: 'UTC',
      budget: { type: 'hourly', min: 50, max: 100, currency: 'USD' },
      remotePreference: 'remote',
      communicationStyle: 'collaborative',
      meetingFrequency: 'weekly',
      autoMatch: true,
      maxMatches: 10,
      responseTimeRequirement: '24-hours',
      requiredSkills: [{ name: '', level: 'intermediate', priority: 'required' }]
    }
  })

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: 'requiredSkills'
  })

  const watchedValues = watch()

  const onSubmit = async (data: TalentRequestForm) => {
    setIsSubmitting(true)
    try {
      // TODO: Submit to API
      console.log('Submitting talent request:', data)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      alert('Talent request submitted successfully!')
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Error submitting request. Please try again.')
    } finally {
      setIsSubmitting(false)
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

  const getBudgetEstimate = () => {
    const { budget, duration, hoursPerWeek } = watchedValues
    if (!budget || !duration) return null

    let totalHours = 0
    switch (duration.unit) {
      case 'days':
        totalHours = duration.value * (hoursPerWeek / 5)
        break
      case 'weeks':
        totalHours = duration.value * hoursPerWeek
        break
      case 'months':
        totalHours = duration.value * hoursPerWeek * 4.33
        break
    }

    const minTotal = budget.min * totalHours
    const maxTotal = budget.max * totalHours

    return { minTotal, maxTotal, totalHours }
  }

  const estimate = getBudgetEstimate()

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    {...register('title')}
                    placeholder="e.g., Senior React Developer for E-commerce Platform"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select onValueChange={(value: any) => setValue('projectType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short-term">Short-term (&lt; 3 months)</SelectItem>
                      <SelectItem value="long-term">Long-term (3+ months)</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="urgency">Urgency Level *</Label>
                  <Select onValueChange={(value: any) => setValue('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Flexible timeline</SelectItem>
                      <SelectItem value="medium">Medium - Standard timeline</SelectItem>
                      <SelectItem value="high">High - Tight timeline</SelectItem>
                      <SelectItem value="urgent">Urgent - ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                  {watchedValues.urgency && (
                    <Badge className={`mt-2 ${getUrgencyColor(watchedValues.urgency)}`}>
                      {watchedValues.urgency.toUpperCase()}
                    </Badge>
                  )}
                </div>

                <div>
                  <Label htmlFor="teamSize">Team Size *</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    max="50"
                    {...register('teamSize', { valueAsNumber: true })}
                    placeholder="Number of people needed"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the project, goals, challenges, and what success looks like..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Skills & Requirements</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="seniorityLevel">Seniority Level *</Label>
                  <Select onValueChange={(value: any) => setValue('seniorityLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seniority level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
                      <SelectItem value="senior">Senior (5+ years)</SelectItem>
                      <SelectItem value="lead">Lead (7+ years)</SelectItem>
                      <SelectItem value="principal">Principal (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Required Skills *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendSkill({ name: '', level: 'intermediate', priority: 'required' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Skill
                  </Button>
                </div>

                <div className="space-y-3">
                  {skillFields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Select onValueChange={(value: any) => setValue(`requiredSkills.${index}.name`, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select skill" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_OPTIONS.map(skill => (
                              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-32">
                        <Select onValueChange={(value: any) => setValue(`requiredSkills.${index}.level`, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-32">
                        <Select onValueChange={(value: any) => setValue(`requiredSkills.${index}.priority`, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="preferred">Preferred</SelectItem>
                            <SelectItem value="nice-to-have">Nice-to-have</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {skillFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSkill(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.requiredSkills && (
                  <p className="text-sm text-red-600 mt-1">{errors.requiredSkills.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Timeline & Availability</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                  />
                </div>

                <div>
                  <Label>Project Duration *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      {...register('duration.value', { valueAsNumber: true })}
                      placeholder="Duration"
                      className="flex-1"
                    />
                    <Select onValueChange={(value: any) => setValue('duration.unit', value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="hoursPerWeek">Hours per Week *</Label>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    min="1"
                    max="168"
                    {...register('hoursPerWeek', { valueAsNumber: true })}
                    placeholder="40"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Select onValueChange={(value: any) => setValue('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="remotePreference">Work Arrangement *</Label>
                  <Select onValueChange={(value: any) => setValue('remotePreference', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work arrangement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Fully Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Budget & Compensation</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetType">Budget Type *</Label>
                  <Select onValueChange={(value: any) => setValue('budget.type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="daily">Daily Rate</SelectItem>
                      <SelectItem value="weekly">Weekly Rate</SelectItem>
                      <SelectItem value="monthly">Monthly Rate</SelectItem>
                      <SelectItem value="fixed">Fixed Project Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select onValueChange={(value: any) => setValue('budget.currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="minBudget">Minimum Budget *</Label>
                  <Input
                    id="minBudget"
                    type="number"
                    min="0"
                    {...register('budget.min', { valueAsNumber: true })}
                    placeholder="50"
                  />
                </div>

                <div>
                  <Label htmlFor="maxBudget">Maximum Budget *</Label>
                  <Input
                    id="maxBudget"
                    type="number"
                    min="0"
                    {...register('budget.max', { valueAsNumber: true })}
                    placeholder="100"
                  />
                </div>
              </div>

              {estimate && (
                <Card className="bg-blue-50 border-blue-200 mt-4">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Budget Estimate</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Total Hours:</span>
                        <div className="font-semibold">{Math.round(estimate.totalHours)} hours</div>
                      </div>
                      <div>
                        <span className="text-blue-700">Estimated Range:</span>
                        <div className="font-semibold">
                          ${estimate.minTotal.toLocaleString()} - ${estimate.maxTotal.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700">Average:</span>
                        <div className="font-semibold">
                          ${Math.round((estimate.minTotal + estimate.maxTotal) / 2).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Communication & Process</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="communicationStyle">Communication Style *</Label>
                  <Select onValueChange={(value: any) => setValue('communicationStyle', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="collaborative">Collaborative</SelectItem>
                      <SelectItem value="independent">Independent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="meetingFrequency">Meeting Frequency *</Label>
                  <Select onValueChange={(value: any) => setValue('meetingFrequency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="as-needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="responseTimeRequirement">Response Time Requirement *</Label>
                  <Select onValueChange={(value: any) => setValue('responseTimeRequirement', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select response time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (&lt; 1 hour)</SelectItem>
                      <SelectItem value="2-hours">Within 2 hours</SelectItem>
                      <SelectItem value="24-hours">Within 24 hours</SelectItem>
                      <SelectItem value="48-hours">Within 48 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="backgroundCheck">Background Check Required</Label>
                    <p className="text-sm text-muted-foreground">Require talent to pass background verification</p>
                  </div>
                  <Switch
                    id="backgroundCheck"
                    {...register('backgroundCheck')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="nda">NDA Required</Label>
                    <p className="text-sm text-muted-foreground">Require signed non-disclosure agreement</p>
                  </div>
                  <Switch
                    id="nda"
                    {...register('nda')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="clientFacing">Client-Facing Role</Label>
                    <p className="text-sm text-muted-foreground">Talent will interact directly with clients</p>
                  </div>
                  <Switch
                    id="clientFacing"
                    {...register('clientFacing')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoMatch">Enable Auto-Matching</Label>
                    <p className="text-sm text-muted-foreground">Automatically find and suggest matching talent</p>
                  </div>
                  <Switch
                    id="autoMatch"
                    {...register('autoMatch')}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Talent Request</h1>
        <p className="text-muted-foreground">
          Tell us about your project and we'll find the perfect talent for you
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map((stepNumber: any) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > stepNumber ? <CheckCircle className="h-4 w-4" /> : stepNumber}
            </div>
            {stepNumber < 5 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          {step < 5 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="min-w-32"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
