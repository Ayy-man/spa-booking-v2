'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gray-200',
        className
      )}
    />
  )
}

// Service Card Skeleton
export function ServiceCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('card space-y-4', className)}>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

// Time Slot Skeleton
export function TimeSlotSkeleton({ className }: SkeletonProps) {
  return (
    <Skeleton className={cn('h-14 w-20 rounded-xl', className)} />
  )
}

// Staff Card Skeleton
export function StaffCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('card', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Date Button Skeleton
export function DateButtonSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col items-center space-y-1', className)}>
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

// Form Field Skeleton
export function FormFieldSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

// Booking Summary Skeleton
export function BookingSummarySkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('card space-y-4', className)}>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  )
}

// Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background section-spacing">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header Skeleton */}
        <div className="text-center mb-12">
          <Skeleton className="h-4 w-32 mx-auto mb-4" />
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-5 w-48 mx-auto" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-8">
          <div className="card">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Skeleton