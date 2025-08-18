'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Users, 
  Target,
  Calendar,
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface ExecutiveKPIProps {
  userType: 'seeker' | 'provider' | 'admin'
  kpis: {
    timeToHire: { current: number; previous: number; unit: 'days' }
    costPerHire: { current: number; previous: number; unit: 'ZAR' }
    conversionRate: { current: number; previous: number; unit: '%' }
    qualityScore: { current: number; previous: number; unit: '/5' }
    pipelineVelocity: { current: number; previous: number; unit: 'days' }
    roi: { current: number; previous: number; unit: '%' }
  }
}

export default function ExecutiveKPIs({ userType, kpis }: ExecutiveKPIProps) {
  const getTrendIcon = (current: number, previous: number, isPositive = true) => {
    const isUp = current > previous
    const shouldShowUp = isPositive ? isUp : !isUp
    
    return shouldShowUp ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    )
  }

  const getTrendColor = (current: number, previous: number, isPositive = true) => {
    const isUp = current > previous
    const shouldShowGreen = isPositive ? isUp : !isUp
    return shouldShowGreen ? 'text-green-600' : 'text-red-600'
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getKPIConfig = () => {
    switch (userType) {
      case 'seeker':
        return {
          title: 'Hiring Performance',
          items: [
            {
              label: 'Avg. Time to Hire',
              value: kpis.timeToHire.current,
              unit: kpis.timeToHire.unit,
              previous: kpis.timeToHire.previous,
              icon: Clock,
              isPositive: false, // Lower is better
              description: 'Days from posting to acceptance'
            },
            {
              label: 'Cost per Hire',
              value: kpis.costPerHire.current,
              unit: kpis.costPerHire.unit,
              previous: kpis.costPerHire.previous,
              icon: DollarSign,
              isPositive: false, // Lower is better
              description: 'Total cost including platform fees'
            },
            {
              label: 'Conversion Rate',
              value: kpis.conversionRate.current,
              unit: kpis.conversionRate.unit,
              previous: kpis.conversionRate.previous,
              icon: Target,
              isPositive: true,
              description: 'Shortlist to hire success rate'
            },
            {
              label: 'Talent Quality',
              value: kpis.qualityScore.current,
              unit: kpis.qualityScore.unit,
              previous: kpis.qualityScore.previous,
              icon: Award,
              isPositive: true,
              description: 'Average rating of hired talent'
            }
          ]
        }
      
      case 'provider':
        return {
          title: 'Performance Metrics',
          items: [
            {
              label: 'Win Rate',
              value: kpis.conversionRate.current,
              unit: kpis.conversionRate.unit,
              previous: kpis.conversionRate.previous,
              icon: Target,
              isPositive: true,
              description: 'Interview to project win rate'
            },
            {
              label: 'Avg. Project Value',
              value: kpis.costPerHire.current,
              unit: kpis.costPerHire.unit,
              previous: kpis.costPerHire.previous,
              icon: DollarSign,
              isPositive: true,
              description: 'Average earnings per project'
            },
            {
              label: 'Response Time',
              value: kpis.pipelineVelocity.current,
              unit: kpis.pipelineVelocity.unit,
              previous: kpis.pipelineVelocity.previous,
              icon: Clock,
              isPositive: false,
              description: 'Time to respond to opportunities'
            },
            {
              label: 'Client Rating',
              value: kpis.qualityScore.current,
              unit: kpis.qualityScore.unit,
              previous: kpis.qualityScore.previous,
              icon: Award,
              isPositive: true,
              description: 'Average client satisfaction'
            }
          ]
        }
      
      case 'admin':
        return {
          title: 'Platform Performance',
          items: [
            {
              label: 'Platform ROI',
              value: kpis.roi.current,
              unit: kpis.roi.unit,
              previous: kpis.roi.previous,
              icon: TrendingUp,
              isPositive: true,
              description: 'Return on platform investment'
            },
            {
              label: 'Match Success Rate',
              value: kpis.conversionRate.current,
              unit: kpis.conversionRate.unit,
              previous: kpis.conversionRate.previous,
              icon: Target,
              isPositive: true,
              description: 'Successful matches to total matches'
            },
            {
              label: 'Avg. Deal Size',
              value: kpis.costPerHire.current,
              unit: kpis.costPerHire.unit,
              previous: kpis.costPerHire.previous,
              icon: DollarSign,
              isPositive: true,
              description: 'Average engagement value'
            },
            {
              label: 'Platform Efficiency',
              value: kpis.timeToHire.current,
              unit: kpis.timeToHire.unit,
              previous: kpis.timeToHire.previous,
              icon: BarChart3,
              isPositive: false,
              description: 'Time from match to acceptance'
            }
          ]
        }
      
      default:
        return { title: 'Performance', items: [] }
    }
  }

  const config = getKPIConfig()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{config.title}</h3>
        <Badge variant="outline" className="text-xs">
          vs. Previous Period
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {config.items.map((item, index) => {
          const Icon = item.icon
          const change = calculateChange(item.value, item.previous)
          const trendColor = getTrendColor(item.value, item.previous, item.isPositive)
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gray-50`}>
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  {getTrendIcon(item.value, item.previous, item.isPositive)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {item.unit === 'ZAR' ? 'R' : ''}{item.value.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.unit !== 'ZAR' ? item.unit : ''}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${trendColor}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs. last period</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                </div>
              </CardContent>
              
              {/* Subtle background gradient */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-transparent opacity-50" />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
