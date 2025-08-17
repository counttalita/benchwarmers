"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OfferCard } from "@/components/offers"
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

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'countered'>('all')
  const [userType, setUserType] = useState<'seeker' | 'provider'>('provider') // This would come from auth context

  useEffect(() => {
    loadOffers()
  }, [filter])

  const loadOffers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        ...(filter !== 'all' && { status: filter })
      })

      const response = await apiClient.get(`/api/offers?${queryParams.toString()}`)
      
      if (response.error) {
        throw response.error
      }

      if (response.data?.offers) {
        setOffers(response.data.offers)
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'LOAD_OFFERS_FAILED',
        err instanceof Error ? err.message : 'Failed to load offers'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const getFilterCounts = () => {
    return {
      all: offers.length,
      pending: offers.filter(o => o.status === 'pending').length,
      accepted: offers.filter(o => o.status === 'accepted').length,
      rejected: offers.filter(o => o.status === 'rejected').length,
      countered: offers.filter(o => o.status === 'countered').length,
    }
  }

  const filteredOffers = filter === 'all' 
    ? offers 
    : offers.filter(offer => offer.status === filter)

  const counts = getFilterCounts()

  if (isLoading && offers.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading offers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {userType === 'provider' ? 'Received Offers' : 'Sent Offers'}
          </h1>
          <p className="text-muted-foreground">
            {userType === 'provider' 
              ? 'Manage offers you\'ve received from companies' 
              : 'Track offers you\'ve sent to talent'
            }
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Offers', count: counts.all },
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'accepted', label: 'Accepted', count: counts.accepted },
              { key: 'countered', label: 'Countered', count: counts.countered },
              { key: 'rejected', label: 'Rejected', count: counts.rejected },
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key as any)}
                className="relative"
              >
                {label}
                {count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 text-xs"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <ErrorAlert 
          error={error} 
          onDismiss={() => setError(null)}
          onRetry={loadOffers}
        />
      )}

      {/* Offers List */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-muted-foreground">
                  {filter === 'all' 
                    ? `No offers ${userType === 'provider' ? 'received' : 'sent'} yet.`
                    : `No ${filter} offers found.`
                  }
                </div>
                {userType === 'seeker' && filter === 'all' && (
                  <Button variant="outline" onClick={() => window.location.href = '/talent'}>
                    Browse Talent
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              userType={userType}
              onOfferUpdated={loadOffers}
            />
          ))
        )}
      </div>

      {/* Summary Stats */}
      {offers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Offer Statistics</CardTitle>
            <CardDescription>
              Your offer activity summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{counts.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{counts.accepted}</div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{counts.countered}</div>
                <div className="text-sm text-muted-foreground">Countered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
