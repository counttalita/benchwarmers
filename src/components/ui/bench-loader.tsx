"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface LoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
  message?: string
}

// 1) PRIMITIVE SPINNERS & ANIMATIONS ==========================================

export function InlineSpinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  )
}

export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// BenchWarmers themed loader with talent connection animation
export function BenchLoader({ className, size = "md", message }: LoaderProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <div className="relative">
        {/* Bench seats representing talent */}
        <div className="flex space-x-2">
          {[0, 1, 2].map((i: any) => (
            <div
              key={i}
              className={cn(
                "bg-blue-500 rounded-lg animate-pulse",
                sizeClasses[size]
              )}
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
        
        {/* Connection line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-300 animate-pulse" />
      </div>
      
      {message && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

// 2) SKELETON COMPONENTS ===================================================

export function AvatarSkeleton() {
  return <Skeleton className="h-10 w-10 rounded-full" />
}

export function LineSkeleton({ width = "w-40" }: { width?: string }) {
  return <Skeleton className={cn("h-3 rounded", width)} />
}

export function ChipSkeleton() {
  return <Skeleton className="h-5 w-16 rounded-full" />
}

export function CardRowSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <AvatarSkeleton />
      <div className="flex-1 space-y-2">
        <LineSkeleton width="w-48" />
        <LineSkeleton width="w-72" />
      </div>
      <ChipSkeleton />
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <CardRowSkeleton key={i} />
      ))}
    </div>
  )
}

// 3) DOMAIN-SPECIFIC LOADERS ===============================================

// Authentication flow loaders
export function OTPLoader({ message = "Sending verification code..." }: { message?: string }) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span className="text-sm text-blue-700">{message}</span>
    </div>
  )
}

// Talent matching loader for seekers
export function TalentMatchingLoader({ message = "Finding perfect matches..." }: { message?: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Generating your shortlist
        </CardTitle>
        <Badge variant="secondary">Matching</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="relative">
          {/* Talent pool visualization */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
        <ListSkeleton rows={3} />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChipSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Offer flow loader
export function OfferFlowLoader({ 
  stage = "preparing" as "preparing" | "sending" | "awaiting",
  message 
}: { 
  stage?: "preparing" | "sending" | "awaiting"
  message?: string 
}) {
  const stageConfig = {
    preparing: { 
      title: "Preparing offer", 
      note: message || "Packaging terms and rate proposal",
      color: "text-blue-600"
    },
    sending: { 
      title: "Sending to provider", 
      note: message || "Securely delivering your offer",
      color: "text-orange-600"
    },
    awaiting: { 
      title: "Awaiting response", 
      note: message || "Provider will accept, decline, or counter",
      color: "text-green-600"
    },
  }

  const config = stageConfig[stage]

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2 text-base font-medium", config.color)}>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{config.note}</p>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

// Payment processing loader
export function PaymentLoader({ message = "Processing secure payment..." }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center space-y-4 p-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 rounded-full">
            <div className="w-full h-full border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-gray-600 text-center">{message}</p>
      </CardContent>
    </Card>
  )
}

// Data table skeleton
export function DataTableSkeleton({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Header */}
        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <LineSkeleton key={i} width="w-full" />
          ))}
        </div>
        {/* Rows */}
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton key={c} className="h-6 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 4) PAGE-LEVEL COMPOSITIONS ===============================================

export function PageLoader({ message = "Loading BenchWarmers..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <BenchLoader size="lg" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">BenchWarmers</h2>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  )
}

export function SearchPageLoader() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-base font-medium">Searching Bench Profiles</span>
          </div>
          <p className="text-sm text-muted-foreground">Ranking by skills, availability, rate fit, seniority.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TalentMatchingLoader />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LineSkeleton width="w-64" />
            <LineSkeleton width="w-56" />
            <div className="flex gap-2">
              <ChipSkeleton />
              <ChipSkeleton />
              <ChipSkeleton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 5) BUTTON STATES =========================================================

export function ButtonLoader({ size = "sm" }: { size?: "sm" | "md" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5"
  }
  
  return (
    <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", sizeClasses[size])} />
  )
}

export function PendingButton({ 
  isPending, 
  children, 
  className, 
  ...props 
}: React.ComponentProps<typeof Button> & { isPending?: boolean }) {
  return (
    <Button 
      className={cn("relative", className)} 
      disabled={isPending || props.disabled} 
      {...props}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-2">
          <ButtonLoader /> Processing…
        </span>
      ) : (
        children
      )}
    </Button>
  )
}