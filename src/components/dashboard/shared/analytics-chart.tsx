'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Filter
} from 'lucide-react'

interface ChartDataPoint {
  label: string
  value: number
  trend?: number
}

interface AnalyticsChartProps {
  title: string
  subtitle?: string
  data: ChartDataPoint[]
  chartType: 'bar' | 'line' | 'funnel'
  timeframe: '7d' | '30d' | '90d' | '1y'
  onTimeframeChange?: (timeframe: string) => void
  valuePrefix?: string
  valueSuffix?: string
}

export default function AnalyticsChart({
  title,
  subtitle,
  data,
  chartType,
  timeframe,
  onTimeframeChange,
  valuePrefix = '',
  valueSuffix = ''
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  
  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="font-semibold">
              {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          {item.trend !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className={`h-3 w-3 ${item.trend >= 0 ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
              <span className={`text-xs ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.trend >= 0 ? '+' : ''}{item.trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderLineChart = () => (
    <div className="h-32 flex items-end justify-between gap-2">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div 
            className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all duration-500 min-h-[4px]"
            style={{ height: `${(item.value / maxValue) * 100}%` }}
          />
          <div className="text-center">
            <div className="text-xs font-medium text-gray-900">
              {valuePrefix}{item.value}{valueSuffix}
            </div>
            <div className="text-xs text-gray-500 truncate w-12">
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderFunnelChart = () => (
    <div className="space-y-2">
      {data.map((item, index) => {
        const width = ((item.value / data[0].value) * 100)
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="font-semibold">
                {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
              </span>
            </div>
            <div className="flex justify-center">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                style={{ 
                  width: `${width}%`,
                  clipPath: index === data.length - 1 ? 'none' : 'polygon(0 0, calc(100% - 20px) 0, 100% 100%, 0 100%)'
                }}
              >
                {((item.value / data[0].value) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'funnel':
        return renderFunnelChart()
      default:
        return renderBarChart()
    }
  }

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 3 months'
      case '1y': return 'Last year'
      default: return 'Last 30 days'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTimeframeLabel(timeframe)}
            </Badge>
            {onTimeframeChange && (
              <Select value={timeframe} onValueChange={onTimeframeChange}>
                <SelectTrigger className="w-24 h-8">
                  <Filter className="h-3 w-3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                  <SelectItem value="1y">1y</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-sm text-gray-500">
              Data will appear here once you have activity
            </p>
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  )
}
