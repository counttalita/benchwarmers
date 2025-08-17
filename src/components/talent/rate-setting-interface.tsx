'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, TrendingUp, Info, Calculator, Globe } from 'lucide-react'

interface RateStructure {
  currency: string
  baseRate: number
  minRate: number
  maxRate: number
  rushRate?: number
  weekendRate?: number
  holidayRate?: number
}

interface RateSettingProps {
  rates: RateStructure[]
  onRatesChange: (rates: RateStructure[]) => void
  primaryCurrency?: string
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' }
]

// Mock exchange rates (in production, fetch from API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  CAD: 1.25,
  AUD: 1.35,
  JPY: 110.0,
  CHF: 0.92,
  SEK: 8.5,
  NOK: 8.8,
  DKK: 6.3
}

export default function RateSettingInterface({
  rates,
  onRatesChange,
  primaryCurrency = 'USD'
}: RateSettingProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(primaryCurrency)
  const [isAddingCurrency, setIsAddingCurrency] = useState(false)
  const [newRate, setNewRate] = useState<Partial<RateStructure>>({
    currency: '',
    baseRate: 0,
    minRate: 0,
    maxRate: 0
  })

  const getCurrencyInfo = (code: string) => {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
  }

  const convertRate = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount
    const usdAmount = amount / EXCHANGE_RATES[fromCurrency]
    return usdAmount * EXCHANGE_RATES[toCurrency]
  }

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = getCurrencyInfo(currency)
    return `${currencyInfo.symbol}${amount.toFixed(currency === 'JPY' ? 0 : 2)}`
  }

  const calculateAnnualEarnings = (rate: RateStructure, hoursPerWeek: number = 40) => {
    const weeksPerYear = 50 // Assuming 2 weeks vacation
    const annualHours = hoursPerWeek * weeksPerYear
    return {
      min: rate.minRate * annualHours,
      base: rate.baseRate * annualHours,
      max: rate.maxRate * annualHours
    }
  }

  const getMarketComparison = (rate: number, currency: string) => {
    // Convert to USD for comparison
    const usdRate = convertRate(rate, currency, 'USD')
    
    if (usdRate < 25) return { level: 'Junior', color: 'bg-green-100 text-green-800', description: 'Entry level rates' }
    if (usdRate < 50) return { level: 'Mid-Level', color: 'bg-blue-100 text-blue-800', description: 'Competitive mid-level rates' }
    if (usdRate < 100) return { level: 'Senior', color: 'bg-purple-100 text-purple-800', description: 'Senior professional rates' }
    if (usdRate < 150) return { level: 'Expert', color: 'bg-orange-100 text-orange-800', description: 'Expert consultant rates' }
    return { level: 'Premium', color: 'bg-red-100 text-red-800', description: 'Premium specialist rates' }
  }

  const addCurrencyRate = () => {
    if (!newRate.currency || !newRate.baseRate || !newRate.minRate || !newRate.maxRate) {
      alert('Please fill in all required fields')
      return
    }

    if (newRate.minRate! > newRate.baseRate! || newRate.baseRate! > newRate.maxRate!) {
      alert('Rates must be in order: Min ≤ Base ≤ Max')
      return
    }

    if (rates.some(r => r.currency === newRate.currency)) {
      alert('Currency already exists')
      return
    }

    const rate: RateStructure = {
      currency: newRate.currency!,
      baseRate: newRate.baseRate!,
      minRate: newRate.minRate!,
      maxRate: newRate.maxRate!,
      rushRate: newRate.rushRate,
      weekendRate: newRate.weekendRate,
      holidayRate: newRate.holidayRate
    }

    onRatesChange([...rates, rate])
    setNewRate({ currency: '', baseRate: 0, minRate: 0, maxRate: 0 })
    setIsAddingCurrency(false)
  }

  const updateRate = (currency: string, updates: Partial<RateStructure>) => {
    const updatedRates = rates.map(rate =>
      rate.currency === currency ? { ...rate, ...updates } : rate
    )
    onRatesChange(updatedRates)
  }

  const removeRate = (currency: string) => {
    onRatesChange(rates.filter(rate => rate.currency !== currency))
  }

  const primaryRate = rates.find(r => r.currency === primaryCurrency)
  const otherRates = rates.filter(r => r.currency !== primaryCurrency)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rate Setting & Currency Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your hourly rates in multiple currencies. Rates are automatically converted for client convenience.
          </p>
        </CardHeader>
      </Card>

      {/* Primary Currency Rate */}
      {primaryRate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getCurrencyInfo(primaryRate.currency).flag}</span>
              Primary Rate - {getCurrencyInfo(primaryRate.currency).name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryMin">Minimum Rate</Label>
                <Input
                  id="primaryMin"
                  type="number"
                  value={primaryRate.minRate}
                  onChange={(e) => updateRate(primaryRate.currency, { minRate: parseFloat(e.target.value) || 0 })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="primaryBase">Standard Rate</Label>
                <Input
                  id="primaryBase"
                  type="number"
                  value={primaryRate.baseRate}
                  onChange={(e) => updateRate(primaryRate.currency, { baseRate: parseFloat(e.target.value) || 0 })}
                  placeholder="75"
                />
              </div>
              <div>
                <Label htmlFor="primaryMax">Maximum Rate</Label>
                <Input
                  id="primaryMax"
                  type="number"
                  value={primaryRate.maxRate}
                  onChange={(e) => updateRate(primaryRate.currency, { maxRate: parseFloat(e.target.value) || 0 })}
                  placeholder="100"
                />
              </div>
            </div>

            {/* Premium Rates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rushRate">Rush Rate (+%)</Label>
                <Input
                  id="rushRate"
                  type="number"
                  value={primaryRate.rushRate || ''}
                  onChange={(e) => updateRate(primaryRate.currency, { rushRate: parseFloat(e.target.value) || undefined })}
                  placeholder="25% extra for urgent work"
                />
              </div>
              <div>
                <Label htmlFor="weekendRate">Weekend Rate (+%)</Label>
                <Input
                  id="weekendRate"
                  type="number"
                  value={primaryRate.weekendRate || ''}
                  onChange={(e) => updateRate(primaryRate.currency, { weekendRate: parseFloat(e.target.value) || undefined })}
                  placeholder="15% extra for weekends"
                />
              </div>
              <div>
                <Label htmlFor="holidayRate">Holiday Rate (+%)</Label>
                <Input
                  id="holidayRate"
                  type="number"
                  value={primaryRate.holidayRate || ''}
                  onChange={(e) => updateRate(primaryRate.currency, { holidayRate: parseFloat(e.target.value) || undefined })}
                  placeholder="50% extra for holidays"
                />
              </div>
            </div>

            {/* Market Analysis */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Market Analysis</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Minimum', rate: primaryRate.minRate },
                  { label: 'Standard', rate: primaryRate.baseRate },
                  { label: 'Maximum', rate: primaryRate.maxRate }
                ].map(({ label, rate }) => {
                  const comparison = getMarketComparison(rate, primaryRate.currency)
                  return (
                    <div key={label} className="text-center">
                      <div className="text-lg font-semibold">
                        {formatCurrency(rate, primaryRate.currency)}
                      </div>
                      <Badge className={comparison.color}>
                        {comparison.level}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {comparison.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Annual Earnings Projection */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" />
                <span className="font-medium">Annual Earnings Projection (40h/week)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {(() => {
                  const earnings = calculateAnnualEarnings(primaryRate)
                  return [
                    { label: 'Minimum', amount: earnings.min },
                    { label: 'Standard', amount: earnings.base },
                    { label: 'Maximum', amount: earnings.max }
                  ].map(({ label, amount }) => (
                    <div key={label}>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(amount, primaryRate.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">{label} Annual</div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Currencies */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Additional Currencies
          </h3>
          <Button onClick={() => setIsAddingCurrency(true)} disabled={isAddingCurrency}>
            Add Currency
          </Button>
        </div>

        {/* Add Currency Form */}
        {isAddingCurrency && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Currency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newCurrency">Currency</Label>
                <Select onValueChange={(value) => setNewRate({ ...newRate, currency: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES
                      .filter(currency => !rates.some(r => r.currency === currency.code))
                      .map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span>{currency.flag}</span>
                            <span>{currency.code} - {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="newMin">Minimum Rate</Label>
                  <Input
                    id="newMin"
                    type="number"
                    value={newRate.minRate}
                    onChange={(e) => setNewRate({ ...newRate, minRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="newBase">Standard Rate</Label>
                  <Input
                    id="newBase"
                    type="number"
                    value={newRate.baseRate}
                    onChange={(e) => setNewRate({ ...newRate, baseRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="newMax">Maximum Rate</Label>
                  <Input
                    id="newMax"
                    type="number"
                    value={newRate.maxRate}
                    onChange={(e) => setNewRate({ ...newRate, maxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Auto-convert suggestion */}
              {newRate.currency && primaryRate && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Suggested Rates</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    Based on your {getCurrencyInfo(primaryRate.currency).name} rates:
                    <div className="mt-1 space-x-4">
                      <span>Min: {formatCurrency(convertRate(primaryRate.minRate, primaryRate.currency, newRate.currency), newRate.currency)}</span>
                      <span>Base: {formatCurrency(convertRate(primaryRate.baseRate, primaryRate.currency, newRate.currency), newRate.currency)}</span>
                      <span>Max: {formatCurrency(convertRate(primaryRate.maxRate, primaryRate.currency, newRate.currency), newRate.currency)}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setNewRate({
                        ...newRate,
                        minRate: convertRate(primaryRate.minRate, primaryRate.currency, newRate.currency!),
                        baseRate: convertRate(primaryRate.baseRate, primaryRate.currency, newRate.currency!),
                        maxRate: convertRate(primaryRate.maxRate, primaryRate.currency, newRate.currency!)
                      })}
                    >
                      Use Suggested Rates
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={addCurrencyRate}>Add Currency</Button>
                <Button variant="outline" onClick={() => setIsAddingCurrency(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Currency Rates */}
        {otherRates.map((rate) => {
          const currencyInfo = getCurrencyInfo(rate.currency)
          return (
            <Card key={rate.currency}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{currencyInfo.flag}</span>
                    {currencyInfo.name}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRate(rate.currency)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Minimum</Label>
                    <Input
                      type="number"
                      value={rate.minRate}
                      onChange={(e) => updateRate(rate.currency, { minRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Standard</Label>
                    <Input
                      type="number"
                      value={rate.baseRate}
                      onChange={(e) => updateRate(rate.currency, { baseRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Maximum</Label>
                    <Input
                      type="number"
                      value={rate.maxRate}
                      onChange={(e) => updateRate(rate.currency, { maxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Comparison with primary currency */}
                {primaryRate && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Equivalent in {getCurrencyInfo(primaryRate.currency).name}:
                      <div className="mt-1 space-x-4">
                        <span>{formatCurrency(convertRate(rate.minRate, rate.currency, primaryRate.currency), primaryRate.currency)}</span>
                        <span>{formatCurrency(convertRate(rate.baseRate, rate.currency, primaryRate.currency), primaryRate.currency)}</span>
                        <span>{formatCurrency(convertRate(rate.maxRate, rate.currency, primaryRate.currency), primaryRate.currency)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Rate Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Setting Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">💡 Best Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Set competitive rates based on your experience</li>
                <li>• Consider market rates in your region</li>
                <li>• Factor in project complexity and urgency</li>
                <li>• Review and adjust rates quarterly</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">⚠️ Important Notes</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Exchange rates update daily</li>
                <li>• Premium rates are percentage additions</li>
                <li>• Clients see rates in their preferred currency</li>
                <li>• All payments processed in your primary currency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
