import { z } from "zod"

// Phone number validation schema
export const phoneNumberSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    "Please enter a valid phone number in international format (e.g., +1234567890)"
  )

// OTP validation schema
export const otpSchema = z
  .string()
  .min(6, "OTP must be 6 digits")
  .max(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only numbers")

// Send OTP request schema
export const sendOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
})

// Verify OTP request schema
export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otp: otpSchema,
})

// Login form schema
export const loginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otp: otpSchema.optional(),
})

// Registration form schema (for company registration)
export const registrationSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters")
    .refine((val) => val.trim().length >= 2, "Company name cannot be only whitespace"),
  companyEmail: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Company email is required")
    .refine((email) => {
      // Validate that email has a proper domain
      const domain = email.split('@')[1]
      return domain && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
    }, "Please use a valid company email with a proper domain"),
  phoneNumber: phoneNumberSchema,
  contactName: z
    .string()
    .min(2, "Contact name must be at least 2 characters")
    .max(50, "Contact name must be less than 50 characters")
    .refine((val) => val.trim().length >= 2, "Contact name cannot be only whitespace"),
  companyType: z.enum(["provider", "seeker", "both"]).refine((val) => val !== undefined, {
    message: "Please select a company type",
  }),
})

// User profile completion schema
export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  role: z.enum(["admin", "member"]).refine((val) => val !== undefined, {
    message: "Please select a role",
  }),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
})

// Type exports for form data
export type SendOtpFormData = z.infer<typeof sendOtpSchema>
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegistrationFormData = z.infer<typeof registrationSchema>
export type UserProfileFormData = z.infer<typeof userProfileSchema>