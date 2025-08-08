'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ServiceCardSkeleton,
  TimeSlotSkeleton,
  StaffCardSkeleton,
  CalendarSkeleton,
  DateButtonSkeleton,
  FormFieldSkeleton,
  FormSkeleton,
  BookingSummarySkeleton,
  BookingTableSkeleton,
  DashboardSkeleton,
  PaymentSkeleton,
  WalkInSkeleton,
  PageLoadingSkeleton
} from '@/components/ui/skeleton-loader'

const SkeletonShowcase: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('service-cards')

  const skeletonDemos = [
    { 
      id: 'service-cards', 
      name: 'Service Selection',
      description: 'Loading states for service selection grid',
      component: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      )
    },
    {
      id: 'time-slots',
      name: 'Time Selection',
      description: 'Loading states for time slot grid',
      component: <TimeSlotSkeleton count={12} />
    },
    {
      id: 'staff-selection',
      name: 'Staff Selection',
      description: 'Loading states for staff member cards',
      component: (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StaffCardSkeleton key={i} />
          ))}
        </div>
      )
    },
    {
      id: 'calendar',
      name: 'Calendar View',
      description: 'Loading state for calendar picker',
      component: <CalendarSkeleton />
    },
    {
      id: 'date-buttons',
      name: 'Date Selection',
      description: 'Loading states for horizontal date picker',
      component: <DateButtonSkeleton count={7} />
    },
    {
      id: 'forms',
      name: 'Form Fields',
      description: 'Loading states for customer information forms',
      component: <FormSkeleton fieldCount={5} />
    },
    {
      id: 'booking-summary',
      name: 'Booking Summary',
      description: 'Loading state for booking confirmation',
      component: <BookingSummarySkeleton />
    },
    {
      id: 'admin-table',
      name: 'Admin Booking Table',
      description: 'Loading state for admin booking management',
      component: <BookingTableSkeleton />
    },
    {
      id: 'dashboard',
      name: 'Admin Dashboard',
      description: 'Loading states for admin dashboard widgets',
      component: <DashboardSkeleton />
    },
    {
      id: 'payment',
      name: 'Payment Processing',
      description: 'Loading state during payment processing',
      component: <PaymentSkeleton />
    },
    {
      id: 'walk-in',
      name: 'Walk-in Assignment',
      description: 'Loading state for walk-in staff assignment',
      component: <WalkInSkeleton />
    }
  ]

  const activeSkeletonDemo = skeletonDemos.find(demo => demo.id === activeDemo)

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading text-primary-dark mb-4">
            Spa Booking Skeleton System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Elegant loading states that maintain the premium spa aesthetic while content loads.
            All animations respect user motion preferences and provide smooth transitions.
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {skeletonDemos.map((demo) => (
              <Button
                key={demo.id}
                variant={activeDemo === demo.id ? "default" : "outline"}
                onClick={() => setActiveDemo(demo.id)}
                className="text-sm"
              >
                {demo.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Demo Container */}
        {activeSkeletonDemo && (
          <Card className="p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-primary-dark mb-2">
                {activeSkeletonDemo.name}
              </h2>
              <p className="text-gray-600">
                {activeSkeletonDemo.description}
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200">
              {activeSkeletonDemo.component}
            </div>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Shimmer Effects</h3>
                <p className="text-sm text-gray-600">
                  Subtle light sweep animations with spa pink accents create an elegant loading experience.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Accessibility First</h3>
                <p className="text-sm text-gray-600">
                  Respects prefers-reduced-motion settings and includes proper ARIA labels for screen readers.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Responsive Design</h3>
                <p className="text-sm text-gray-600">
                  Mobile-first approach with proper scaling across all device sizes and orientations.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7H7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Staggered Animations</h3>
                <p className="text-sm text-gray-600">
                  Cascading effects for multiple elements create engaging visual hierarchy.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Premium Feel</h3>
                <p className="text-sm text-gray-600">
                  Sophisticated timing and easing create a calm, spa-like loading experience.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-primary-dark mb-2">Spa Theme</h3>
                <p className="text-sm text-gray-600">
                  Uses the medical spa color palette with subtle pink accents and elegant gradients.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Implementation Guide */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-primary-dark mb-4">
            Implementation Guide
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Basic Usage</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800">
{`import { ServiceCardSkeleton, StaffCardSkeleton } from '@/components/ui/skeleton-loader'

// Show skeleton while loading
{loading ? (
  <ServiceCardSkeleton />
) : (
  <ServiceCard service={service} />
)}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Staggered Animation Example</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800">
{`// Staggered skeleton loading
{Array.from({ length: 6 }).map((_, i) => (
  <ServiceCardSkeleton
    key={i}
    className="animate-fade-in-up"
    style={{ animationDelay: \`\${i * 150}ms\` }}
  />
))}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Custom Skeleton Variants</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-800">
{`// Primary theme skeleton (spa pink accent)
<Skeleton className="skeleton-primary h-6 w-32" />

// Success theme skeleton (green accent)
<Skeleton className="skeleton-success h-6 w-32" />

// Secondary theme skeleton (light pink)
<Skeleton className="skeleton-secondary h-6 w-32" />`}
                </pre>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Spa Booking Skeleton System - Elegant loading states for premium user experiences</p>
        </div>
      </div>
    </div>
  )
}

export default SkeletonShowcase