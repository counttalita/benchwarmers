"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert } from "@/components/error"

interface Offer {
  id: string
  talentId: string
  talentName: string
  seekerCompanyName: string
  rate: number
  startDate: string
  duration: string
  terms: string
  status: 'pending' | 'accepted' | 'rejected' | 'countered'
  totalAmount: number
  platformFee: number
  netAmount: number
  createdAt: string
  counterOffer?: {
    rate: number
    terms: string
    message: string
  }
}

interface OfferCardProps {
  offer: Offer
  userType: 'seeker' | 'provider'
  onOfferUpdated?: () => void
}

export function OfferCard({ offer, userType, onOfferUpdated }: OfferCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [counterRate, setCounterRate] = useState(offer.rate)
  const [counterMessage, setCounterMessage] = useState("")

  const handleOfferResponse = async (action: 'accept' | 'reject' | 'counter') => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: any = {
        action
      }

      if (action === 'counter') {
        payload.counterRate = counterRate
        payload.message = counterMessage
      }

      const response = await apiClient.post(`/api/offers/${offer.id}/respond`, payload)
      
      if (response.error) {
        throw response.error
      }

      setShowCounterForm(false)
      onOfferUpdated?.()
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'OFFER_RESPONSE_FAILED',
        err instanceof Error ? err.message : 'Failed to respond to offer'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800", 
      rejected: "bg-red-100 text-red-800",
      countered: "bg-blue-100 text-blue-800"
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const calculateHours = (duration: string) => {
    if (duration.includes("week")) {
      const weeks = parseInt(duration) || 0
      return weeks * 40
    } else if (duration.includes("month")) {
      const months = parseInt(duration) || 0
      return months * 160
    }
    return parseInt(duration) || 0
  }

  const totalHours = calculateHours(offer.duration)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {userType === 'provider' ? `Offer from ${offer.seekerCompanyName}` : `Offer to ${offer.talentName}`}
            </CardTitle>
            <CardDescription>
              Created {new Date(offer.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          {getStatusBadge(offer.status)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Offer Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Rate:</span>
            <div className="mt-1">${offer.rate}/hour</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Start Date:</span>
            <div className="mt-1">{new Date(offer.startDate).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Duration:</span>
            <div className="mt-1">{offer.duration} ({totalHours} hours)</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Total Amount:</span>
            <div className="mt-1 font-semibold">${offer.totalAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Terms */}
        <div>
          <span className="font-medium text-gray-600">Terms & Conditions:</span>
          <div className="mt-1 text-sm bg-gray-50 p-3 rounded-md">
            {offer.terms}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal ({totalHours} hours × ${offer.rate})</span>
              <span>${offer.netAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee (15%)</span>
              <span>${offer.platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total</span>
              <span>${offer.totalAmount.toFixed(2)}</span>
            </div>
            {userType === 'provider' && (
              <div className="text-xs text-blue-600 mt-2">
                You will receive: ${offer.netAmount.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Counter Offer Display */}
        {offer.status === 'countered' && offer.counterOffer && (
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-800 mb-2">Counter Offer</h4>
            <div className="text-sm space-y-1">
              <div>New Rate: ${offer.counterOffer.rate}/hour</div>
              {offer.counterOffer.message && (
                <div>
                  <span className="font-medium">Message:</span>
                  <div className="mt-1">{offer.counterOffer.message}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <ErrorAlert 
            error={error} 
            onDismiss={() => setError(null)}
          />
        )}

        {/* Action Buttons */}
        {offer.status === 'pending' && userType === 'provider' && (
          <div className="flex space-x-2">
            <Button
              onClick={() => handleOfferResponse('accept')}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Processing..." : "Accept Offer"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCounterForm(!showCounterForm)}
              disabled={isLoading}
            >
              Counter
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleOfferResponse('reject')}
              disabled={isLoading}
            >
              Reject
            </Button>
          </div>
        )}

        {/* Counter Offer Form */}
        {showCounterForm && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Make Counter Offer</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">New Rate ($/hour)</label>
                <input
                  type="number"
                  value={counterRate}
                  onChange={(e: any) => setCounterRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message (optional)</label>
              <textarea
                value={counterMessage}
                onChange={(e: any) => setCounterMessage(e.target.value)}
                placeholder="Explain your counter offer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleOfferResponse('counter')}
                disabled={isLoading}
                size="sm"
              >
                Send Counter Offer
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCounterForm(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {offer.status === 'accepted' && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-green-800 text-sm">
              ✅ Offer accepted! The engagement will begin on {new Date(offer.startDate).toLocaleDateString()}.
            </div>
          </div>
        )}

        {offer.status === 'rejected' && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-red-800 text-sm">
              ❌ Offer was rejected.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
