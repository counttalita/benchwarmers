import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')

export const urlSchema = z.string().url('Invalid URL format')

export const domainSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Invalid domain format')

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const dateSchema = z.string().datetime('Invalid date format')

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  password: passwordSchema,
  role: z.enum(['admin', 'company', 'talent']),
  companyId: z.string().optional(),
  phoneNumber: phoneSchema.optional()
})

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  phoneNumber: phoneSchema.optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional()
})

// Company validation schemas
export const companyRegistrationSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name must be less than 100 characters'),
  domain: domainSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  industry: z.string().max(50, 'Industry must be less than 50 characters').optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: urlSchema.optional()
})

export const companyUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: domainSchema.optional(),
  description: z.string().max(500).optional(),
  industry: z.string().max(50).optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: urlSchema.optional(),
  status: z.enum(['pending', 'active', 'suspended', 'rejected']).optional()
})

// Talent profile validation schemas
export const talentProfileSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  skills: z.array(z.string().min(1, 'Skill cannot be empty')).min(1, 'At least one skill is required').max(20, 'Maximum 20 skills allowed'),
  experience: z.number().min(0, 'Experience must be non-negative').max(50, 'Experience must be less than 50 years'),
  hourlyRate: z.number().min(10, 'Hourly rate must be at least $10').max(1000, 'Hourly rate must be less than $1000'),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  isAvailable: z.boolean().optional(),
  portfolio: z.array(urlSchema).max(10, 'Maximum 10 portfolio links').optional(),
  certifications: z.array(z.string()).max(20, 'Maximum 20 certifications').optional()
})

// Talent request validation schemas
export const talentRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  skills: z.array(z.string().min(1, 'Skill cannot be empty')).min(1, 'At least one skill is required').max(20, 'Maximum 20 skills allowed'),
  budget: z.object({
    min: z.number().min(10, 'Minimum budget must be at least $10'),
    max: z.number().min(10, 'Maximum budget must be at least $10')
  }).refine(data => data.max >= data.min, 'Maximum budget must be greater than or equal to minimum budget'),
  duration: z.enum(['short-term', 'medium-term', 'long-term']),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  location: z.enum(['remote', 'onsite', 'hybrid']),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
})

// Offer validation schemas
export const offerSchema = z.object({
  talentRequestId: uuidSchema,
  talentProfileId: uuidSchema,
  amount: z.number().min(10, 'Amount must be at least $10'),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  terms: z.string().max(2000, 'Terms must be less than 2000 characters').optional()
})

// Payment validation schemas
export const paymentSchema = z.object({
  engagementId: uuidSchema,
  amount: z.number().min(1, 'Amount must be at least $1'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional()
})

export const paymentReleaseSchema = z.object({
  transactionId: uuidSchema,
  providerAccountId: z.string().min(1, 'Provider account ID is required')
})

// Review validation schemas
export const reviewSchema = z.object({
  engagementId: uuidSchema,
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
  categories: z.array(z.enum(['communication', 'quality', 'timeliness', 'professionalism'])).min(1, 'At least one category is required')
})

// Dispute validation schemas
export const disputeSchema = z.object({
  engagementId: uuidSchema,
  reason: z.enum(['payment', 'quality', 'communication', 'timeliness', 'other']),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  evidence: z.array(urlSchema).max(10, 'Maximum 10 evidence links').optional()
})

// File validation schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().optional().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).optional().default(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
})

// Pagination validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Search validation schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
  filters: z.record(z.any()).optional(),
  ...paginationSchema.shape
})

// Utility validation functions
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export function validatePassword(password: string): boolean {
  try {
    passwordSchema.parse(password)
    return true
  } catch {
    return false
  }
}

export function validatePhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone)
    return true
  } catch {
    return false
  }
}

export function validateDomain(domain: string): boolean {
  try {
    domainSchema.parse(domain)
    return true
  } catch {
    return false
  }
}

export function validateURL(url: string): boolean {
  try {
    urlSchema.parse(url)
    return true
  } catch {
    return false
  }
}

export function validateUUID(uuid: string): boolean {
  try {
    uuidSchema.parse(uuid)
    return true
  } catch {
    return false
  }
}

export function validateDate(date: string): boolean {
  try {
    dateSchema.parse(date)
    return true
  } catch {
    return false
  }
}

// Sanitization functions
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '')
}

export function sanitizeURL(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

// Validation error helpers
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.errors.forEach(err => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}

export function formatValidationError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
}
