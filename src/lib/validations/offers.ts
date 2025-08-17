import { z } from "zod"

export const offerSchema = z.object({
  talentId: z.string().min(1, "Talent ID is required"),
  requestId: z.string().optional(),
  rate: z.number().min(1, "Rate must be at least $1/hour").max(1000, "Rate cannot exceed $1000/hour"),
  startDate: z.string().min(1, "Start date is required"),
  duration: z.string().min(1, "Duration is required"),
  terms: z.string().min(10, "Terms must be at least 10 characters").max(2000, "Terms cannot exceed 2000 characters"),
})

export type OfferFormData = z.infer<typeof offerSchema>

export const offerResponseSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  action: z.enum(["accept", "reject", "counter"]),
  counterRate: z.number().optional(),
  counterTerms: z.string().optional(),
  message: z.string().optional(),
})

export type OfferResponseData = z.infer<typeof offerResponseSchema>
