"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { offerSchema, type OfferFormData } from "@/lib/validations/offers"
import { apiClient } from "@/lib/api/client"
import { createError, AppError, AppErrorImpl } from "@/lib/errors"
import { ErrorAlert, SuccessAlert } from "@/components/error"

interface OfferFormProps {
  talentId: string
  talentName: string
  talentRate: number
  requestId?: string
  onOfferCreated?: (offerId: string) => void
}

export function OfferForm({ 
  talentId, 
  talentName, 
  talentRate, 
  requestId,
  onOfferCreated 
}: OfferFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      talentId,
      requestId: requestId || "",
      rate: talentRate,
      startDate: "",
      duration: "",
      terms: "",
    },
  })

  const watchedValues = form.watch()
  
  // Calculate total cost breakdown
  const calculateCosts = () => {
    const rate = watchedValues.rate || 0
    const duration = watchedValues.duration || ""
    
    let totalHours = 0
    
    // Parse duration to calculate hours
    if (duration.includes("week")) {
      const weeks = parseInt(duration) || 0
      totalHours = weeks * 40 // 40 hours per week
    } else if (duration.includes("month")) {
      const months = parseInt(duration) || 0
      totalHours = months * 160 // 160 hours per month (4 weeks * 40 hours)
    } else if (duration.includes("hour")) {
      totalHours = parseInt(duration) || 0
    }
    
    const subtotal = rate * totalHours
    const platformFee = subtotal * 0.15 // 15% platform fee
    const totalAmount = subtotal + platformFee
    
    return {
      totalHours,
      subtotal,
      platformFee,
      totalAmount,
      rate
    }
  }

  const costs = calculateCosts()

  const onSubmit = async (data: OfferFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/api/offers', {
        ...data,
        totalAmount: costs.totalAmount,
        platformFee: costs.platformFee,
        netAmount: costs.subtotal
      })
      
      if (response.error) {
        throw response.error
      }

      setSuccess(true)
      
      if (onOfferCreated && response.data?.offer?.id) {
        onOfferCreated(response.data.offer.id)
      }
    } catch (err) {
      const appError = err instanceof AppErrorImpl ? err : createError.validation(
        'OFFER_CREATION_FAILED',
        err instanceof Error ? err.message : 'Failed to create offer'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
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
            <div>
              <h3 className="text-lg font-semibold text-green-800">Offer Sent!</h3>
              <p className="text-green-600">
                Your offer has been sent to {talentName}. They will be notified via SMS and email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Offer for {talentName}</CardTitle>
          <CardDescription>
            Define the terms and compensation for this engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="85" 
                          {...field}
                          onChange={(e: any) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Suggested rate: ${talentRate}/hour
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Select duration</option>
                        <option value="1 week">1 week (40 hours)</option>
                        <option value="2 weeks">2 weeks (80 hours)</option>
                        <option value="1 month">1 month (160 hours)</option>
                        <option value="2 months">2 months (320 hours)</option>
                        <option value="3 months">3 months (480 hours)</option>
                        <option value="6 months">6 months (960 hours)</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      Standard engagement durations with estimated hours
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Describe the project scope, deliverables, payment terms, and any specific requirements..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include project scope, deliverables, and payment schedule
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
                {isLoading ? "Creating Offer..." : "Send Offer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {costs.totalHours > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>
              Total cost calculation for this engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Rate: ${costs.rate}/hour × {costs.totalHours} hours
                </span>
                <span className="font-medium">${costs.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Platform Fee (15%)
                </span>
                <span className="font-medium">${costs.platformFee.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <div className="text-right">
                    <div className="font-bold text-lg">${costs.totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Talent receives: ${costs.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-4 h-4 text-blue-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Payment Protection</p>
                    <p>Funds are held in escrow until project completion and approval.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
