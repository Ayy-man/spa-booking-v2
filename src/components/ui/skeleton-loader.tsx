'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-xl bg-gray-200',
        className
      )}
    />
  )
}

// Enhanced Service Card Skeleton with elegant spa-like animations
export function ServiceCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'service-card-skeleton bg-white p-6 rounded-xl shadow-md border border-primary/5 space-y-4 relative overflow-hidden',
      className
    )}>
      {/* Animated shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Service title */}
      <Skeleton className="h-6 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300" />
      
      {/* Service description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full bg-gradient-to-r from-gray-200 to-gray-300" />
        <Skeleton className="h-4 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300" />
      </div>
      
      {/* Price and duration row */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-20 bg-gradient-to-r from-primary/10 to-primary/20 rounded-lg" />
        <Skeleton className="h-4 w-16 bg-gray-200 rounded-full" />
      </div>
      
      {/* Book button */}
      <Skeleton className="h-12 w-full bg-gradient-to-r from-gray-900/80 to-gray-900/60 rounded-xl" />
    </div>
  )
}

// Enhanced Time Slot Skeleton with wave animation
export function TimeSlotSkeleton({ className, count = 8 }: SkeletonProps & { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'time-slot-skeleton h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden border border-gray-200/50',
            'animate-pulse-wave',
            className
          )}
          style={{
            animationDelay: `${i * 100}ms`
          }}
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-4 w-12 bg-gray-300/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Enhanced Staff Card Skeleton with elegant profile animation
export function StaffCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'staff-card-skeleton card bg-white p-6 rounded-xl shadow-md border border-primary/5 relative overflow-hidden',
      className
    )}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="flex items-center space-x-4">
        {/* Staff avatar with gradient */}
        <div className="relative">
          <Skeleton className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
        </div>
        
        <div className="flex-1 space-y-3">
          {/* Staff name */}
          <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
          
          {/* Staff role/specialties */}
          <Skeleton className="h-4 w-48 bg-gradient-to-r from-gray-150 to-gray-250" />
          
          {/* Capability badges */}
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16 rounded-full bg-primary/10" />
            <Skeleton className="h-6 w-20 rounded-full bg-primary/15" />
            <Skeleton className="h-6 w-14 rounded-full bg-primary/10" />
          </div>
          
          {/* Availability indicator */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full bg-green-200" />
            <Skeleton className="h-3 w-20 bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Calendar/Date Selection Skeleton
export function CalendarSkeleton({ className }: SkeletonProps) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysInMonth = Array.from({ length: 35 }, (_, i) => i + 1)
  
  return (
    <div className={cn('calendar-skeleton bg-white p-6 rounded-xl shadow-md border border-primary/5 space-y-4', className)}>
      {/* Calendar header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-8 rounded-lg bg-gray-200" />
        <Skeleton className="h-6 w-32 bg-gradient-to-r from-primary/20 to-primary/30" />
        <Skeleton className="h-8 w-8 rounded-lg bg-gray-200" />
      </div>
      
      {/* Week days */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => (
          <div key={day} className="text-center py-2">
            <Skeleton className="h-4 w-8 mx-auto bg-gray-200" />
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((_, i) => (
          <div
            key={i}
            className={cn(
              'date-skeleton h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden',
              'animate-pulse-wave'
            )}
            style={{
              animationDelay: `${i * 50}ms`
            }}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Date Button Skeleton for horizontal date picker
export function DateButtonSkeleton({ className, count = 7 }: SkeletonProps & { count?: number }) {
  return (
    <div className="flex space-x-3 overflow-x-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'date-button-skeleton flex flex-col items-center space-y-1 p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden min-w-[80px]',
            'animate-pulse-wave',
            className
          )}
          style={{
            animationDelay: `${i * 150}ms`
          }}
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <Skeleton className="h-4 w-8 bg-gray-300/60" />
          <Skeleton className="h-3 w-12 bg-gray-300/60" />
        </div>
      ))}
    </div>
  )
}

// Enhanced Form Field Skeleton with floating label style
export function FormFieldSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('form-field-skeleton space-y-2 relative', className)}>
      {/* Label */}
      <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300" />
      
      {/* Input field with elegant styling */}
      <div className="relative">
        <Skeleton className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-150 border border-gray-200/50" />
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl" />
      </div>
    </div>
  )
}

// Multi-field form skeleton
export function FormSkeleton({ className, fieldCount = 4 }: SkeletonProps & { fieldCount?: number }) {
  return (
    <div className={cn('form-skeleton space-y-6 bg-white p-6 rounded-xl shadow-md border border-primary/5', className)}>
      {Array.from({ length: fieldCount }).map((_, i) => (
        <FormFieldSkeleton
          key={i}
          className="animate-fade-in-up"
          style={{
            animationDelay: `${i * 200}ms`
          } as React.CSSProperties}
        />
      ))}
      
      {/* Submit button */}
      <div className="pt-4">
        <Skeleton className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-900/60 to-gray-900/40" />
      </div>
    </div>
  )
}

// Enhanced Booking Summary Skeleton with elegant design
export function BookingSummarySkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'booking-summary-skeleton card space-y-4 bg-white p-6 rounded-xl shadow-lg border border-primary/10 relative overflow-hidden',
      className
    )}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      
      {/* Title */}
      <Skeleton className="h-6 w-40 bg-gradient-to-r from-primary/20 to-primary/30 rounded-lg" />
      
      {/* Booking details */}
      <div className="space-y-3">
        {[
          { label: 20, value: 32 },
          { label: 16, value: 28 },
          { label: 24, value: 24 },
          { label: 12, value: 16 }
        ].map((item, i) => (
          <div key={i} className="flex justify-between items-center" style={{
            animationDelay: `${i * 100}ms`
          }}>
            <Skeleton className={`h-4 w-${item.label} bg-gray-200 animate-pulse-wave`} />
            <Skeleton className={`h-4 w-${item.value} bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse-wave`} />
          </div>
        ))}
      </div>
      
      {/* Total section */}
      <div className="pt-4 border-t border-gray-200/50">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-16 bg-gray-300 rounded-lg" />
          <Skeleton className="h-6 w-20 bg-gradient-to-r from-primary/30 to-primary/40 rounded-lg" />
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="pt-4 space-y-3">
        <Skeleton className="h-12 w-full bg-gradient-to-r from-gray-900/70 to-gray-900/50 rounded-xl" />
        <Skeleton className="h-10 w-full bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

// Enhanced Page Loading Skeleton with staggered animations
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background section-spacing relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="h-full w-full bg-gradient-to-br from-primary via-transparent to-primary" />
      </div>
      
      <div className="container mx-auto px-6 max-w-4xl relative">
        {/* Header Skeleton with elegant animations */}
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="h-4 w-32 mx-auto bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse-wave" />
          <Skeleton className="h-10 w-64 mx-auto bg-gradient-to-r from-primary/20 to-primary/30 animate-pulse-wave" 
                   style={{ animationDelay: '200ms' } as React.CSSProperties} />
          <Skeleton className="h-5 w-48 mx-auto bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse-wave" 
                   style={{ animationDelay: '400ms' } as React.CSSProperties} />
        </div>

        {/* Content Skeleton with staggered service cards */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-primary/5 relative overflow-hidden">
            {/* Section shimmer */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <Skeleton className="h-8 w-48 mb-6 bg-gradient-to-r from-primary/30 to-primary/40" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ServiceCardSkeleton
                  key={i}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 150}ms`
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin Panel Skeleton Components

// Booking Table Skeleton for admin dashboard
export function BookingTableSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'booking-table-skeleton bg-white rounded-xl shadow-lg border border-primary/5 overflow-hidden',
      className
    )}>
      {/* Table header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32 bg-gradient-to-r from-primary/20 to-primary/30" />
          <Skeleton className="h-8 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
      
      {/* Table rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-4 flex items-center space-x-4 relative overflow-hidden"
            style={{
              animationDelay: `${i * 100}ms`
            }}
          >
            {/* Row shimmer */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Time */}
            <Skeleton className="h-5 w-16 bg-gray-200 flex-shrink-0" />
            
            {/* Service */}
            <Skeleton className="h-4 w-24 bg-gray-200 flex-1" />
            
            {/* Room */}
            <Skeleton className="h-4 w-12 bg-gray-200 flex-shrink-0" />
            
            {/* Staff */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Skeleton className="h-6 w-6 rounded-full bg-primary/20" />
              <Skeleton className="h-4 w-16 bg-gray-200" />
            </div>
            
            {/* Status */}
            <Skeleton className="h-6 w-18 bg-gradient-to-r from-green-200 to-green-300 rounded-full flex-shrink-0" />
            
            {/* Actions */}
            <Skeleton className="h-6 w-6 bg-gray-200 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard Widget Skeleton
export function DashboardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('dashboard-skeleton space-y-6', className)}>
      {/* Stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="stat-card-skeleton bg-white p-6 rounded-xl shadow-md border border-primary/5 relative overflow-hidden"
            style={{
              animationDelay: `${i * 150}ms`
            }}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-gray-200" />
                <Skeleton className="h-8 w-16 bg-gradient-to-r from-primary/20 to-primary/30 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-12 bg-gray-200 rounded-xl" />
            </div>
            
            {/* Trend indicator */}
            <div className="flex items-center space-x-2 mt-4">
              <Skeleton className="h-4 w-4 bg-green-200 rounded" />
              <Skeleton className="h-3 w-12 bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large chart/calendar area */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-primary/5 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <Skeleton className="h-6 w-32 bg-gradient-to-r from-primary/20 to-primary/30 mb-6" />
            
            {/* Chart placeholder */}
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-end space-x-2 h-32">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="bg-gradient-to-t from-primary/20 to-primary/10 rounded-t-lg flex-1"
                      style={{
                        height: `${Math.random() * 80 + 20}%`,
                        animationDelay: `${(i * 7 + j) * 50}ms`
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sidebar content */}
        <div className="space-y-6">
          {/* Recent bookings */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-primary/5 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <Skeleton className="h-5 w-24 bg-gradient-to-r from-primary/20 to-primary/30 mb-4" />
            
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3" style={{
                  animationDelay: `${i * 100}ms`
                }}>
                  <Skeleton className="h-8 w-8 rounded-full bg-primary/20" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full bg-gray-200" />
                    <Skeleton className="h-3 w-2/3 bg-gray-200" />
                  </div>
                  <Skeleton className="h-4 w-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-primary/5">
            <Skeleton className="h-5 w-20 bg-gradient-to-r from-primary/20 to-primary/30 mb-4" />
            
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"
                  style={{
                    animationDelay: `${i * 150}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Payment Processing Skeleton
export function PaymentSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'payment-skeleton bg-white p-6 rounded-xl shadow-lg border border-primary/10 space-y-6 relative overflow-hidden',
      className
    )}>
      {/* Security shimmer */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
      
      {/* Payment header */}
      <div className="text-center space-y-3">
        <Skeleton className="h-8 w-48 mx-auto bg-gradient-to-r from-primary/30 to-primary/40 rounded-lg" />
        <Skeleton className="h-4 w-64 mx-auto bg-gray-200" />
      </div>
      
      {/* Payment amount */}
      <div className="text-center py-6 border-y border-gray-100">
        <Skeleton className="h-12 w-32 mx-auto bg-gradient-to-r from-primary/40 to-primary/50 rounded-xl" />
        <Skeleton className="h-4 w-20 mx-auto mt-2 bg-gray-200" />
      </div>
      
      {/* Payment methods */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="payment-method-skeleton p-4 border-2 border-gray-200 rounded-xl relative overflow-hidden cursor-pointer"
            style={{
              animationDelay: `${i * 100}ms`
            }}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-12 bg-gradient-to-r from-blue-200 to-blue-300 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-16 bg-gray-200 mb-1" />
                <Skeleton className="h-3 w-12 bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Security badges */}
      <div className="flex justify-center space-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 w-16 bg-gradient-to-r from-green-200 to-green-300 rounded"
            style={{
              animationDelay: `${i * 200}ms`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Walk-in Assignment Skeleton
export function WalkInSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'walk-in-skeleton bg-white p-6 rounded-xl shadow-md border border-primary/5 space-y-4 relative overflow-hidden',
      className
    )}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Walk-in header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28 bg-gradient-to-r from-amber-200 to-amber-300 rounded-lg" />
        <Skeleton className="h-8 w-20 bg-gray-200 rounded-lg" />
      </div>
      
      {/* Available staff grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="staff-option-skeleton p-4 border border-gray-200 rounded-lg relative overflow-hidden"
            style={{
              animationDelay: `${i * 150}ms`
            }}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/30" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 bg-gray-200 mb-1" />
                <Skeleton className="h-3 w-16 bg-gray-200" />
              </div>
              <Skeleton className="h-4 w-4 bg-green-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Assignment button */}
      <Skeleton className="h-12 w-full bg-gradient-to-r from-primary/60 to-primary/40 rounded-xl" />
    </div>
  )
}

export default Skeleton