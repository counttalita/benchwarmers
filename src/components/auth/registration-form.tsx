"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validations/auth"
import { apiClient } from "@/lib/api/client"
import { createError, AppError, logUserAction } from "@/lib/errors"
import { ErrorAlert, SuccessAlert } from "@/components/error"

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      companyName: "",
      companyEmail: "",
      phoneNumber: "",
      contactName: "",
      companyType: undefined,
    },
  })

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true)
    setError(null)

    logUserAction('anonymous', 'company_registration_attempt', data.companyName)

    try {
      const response = await apiClient.post('/api/auth/register', data)
      
      if (response.error) {
        throw response.error
      }

      logUserAction('anonymous', 'company_registration_success', data.companyName)

      setSuccess(true)
      
      // Redirect to completion page with company ID
      setTimeout(() => {
        if (response.data?.company?.id) {
          router.push(`/auth/register/complete?companyId=${response.data.company.id}`)
        } else {
          router.push("/auth/login")
        }
      }, 2000)
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'REGISTRATION_FAILED',
        err instanceof Error ? err.message : 'Registration failed'
      )
      setError(appError)
      logUserAction('anonymous', 'company_registration_failed', data.companyName, false, appError)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600">Registration Submitted!</h1>
          <div className="space-y-2 text-muted-foreground">
            <p>Your company registration has been submitted successfully!</p>
            <p>📧 Check your email to verify domain ownership</p>
            <p>📱 You&apos;ll receive SMS updates on your approval status</p>
            <p>Redirecting to registration status page...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Register Your Company</h1>
        <p className="text-muted-foreground">
          Join BenchWarmers marketplace to connect talent with opportunities
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Corporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Email</FormLabel>
                <FormControl>
                  <Input placeholder="contact@yourcompany.com" type="email" {...field} />
                </FormControl>
                <FormDescription>
                  Use your company email address. We&apos;ll verify domain ownership through this email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" type="tel" {...field} />
                </FormControl>
                <FormDescription>
                  We&apos;ll send verification codes to this number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Type</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="">Select company type</option>
                    <option value="provider">Talent Provider</option>
                    <option value="seeker">Talent Seeker</option>
                    <option value="both">Both Provider & Seeker</option>
                  </select>
                </FormControl>
                <FormDescription>
                  Providers offer talent, seekers hire talent, or choose both
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <ErrorAlert 
              error={error} 
              onDismiss={() => setError(null)}
              onRetry={() => form.handleSubmit(onSubmit)()}
            />
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Register Company"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button variant="link" className="p-0 h-auto" asChild>
          <a href="/auth/login">Sign in</a>
        </Button>
      </div>
    </div>
  )
}