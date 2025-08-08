/**
 * Spa Booking Skeleton System
 * 
 * Comprehensive loading skeleton components for the medical spa booking system.
 * Provides elegant, premium loading experiences that maintain the spa aesthetic.
 * 
 * Features:
 * - Shimmer animations with spa pink accents
 * - Responsive design for all screen sizes
 * - Accessibility-first with reduced motion support
 * - Staggered animations for visual hierarchy
 * - Smooth transitions from skeleton to content
 * - Premium spa-like timing and easing
 */

// Core skeleton utilities
export { Skeleton } from './skeleton-loader'

// Customer-facing skeleton components
export {
  ServiceCardSkeleton,
  TimeSlotSkeleton,
  StaffCardSkeleton,
  CalendarSkeleton,
  DateButtonSkeleton,
  FormFieldSkeleton,
  FormSkeleton,
  BookingSummarySkeleton,
  PageLoadingSkeleton,
  PaymentSkeleton
} from './skeleton-loader'

// Admin panel skeleton components
export {
  BookingTableSkeleton,
  DashboardSkeleton,
  WalkInSkeleton
} from './skeleton-loader'

// Skeleton loading hooks
export {
  useSkeletonLoading,
  useStaggeredSkeleton,
  useSkeletonCrossfade,
  useSkeletonWithData
} from '../hooks/use-skeleton-loading'

// Example components
export { default as SkeletonShowcase } from '../examples/skeleton-showcase'
export { default as SkeletonIntegrationExample } from '../examples/skeleton-integration-example'

/**
 * Quick Start Guide:
 * 
 * 1. Basic Usage:
 * ```tsx
 * import { ServiceCardSkeleton } from '@/components/ui/skeleton-system'
 * 
 * {loading ? <ServiceCardSkeleton /> : <ServiceCard service={service} />}
 * ```
 * 
 * 2. With Loading Hook:
 * ```tsx
 * import { useSkeletonLoading, StaffCardSkeleton } from '@/components/ui/skeleton-system'
 * 
 * const skeleton = useSkeletonLoading(true)
 * 
 * useEffect(() => {
 *   fetchData().then(() => skeleton.stopLoading())
 * }, [])
 * 
 * return skeleton.showSkeleton ? <StaffCardSkeleton /> : <StaffList />
 * ```
 * 
 * 3. Staggered Animation:
 * ```tsx
 * import { useStaggeredSkeleton, ServiceCardSkeleton } from '@/components/ui/skeleton-system'
 * 
 * const staggered = useStaggeredSkeleton(6)
 * 
 * return (
 *   <div className="grid grid-cols-3 gap-6">
 *     {Array.from({ length: 6 }).map((_, i) => (
 *       <ServiceCardSkeleton
 *         key={i}
 *         className={staggered.isItemVisible(i) ? 'animate-fade-in-up' : 'opacity-0'}
 *         style={{ animationDelay: `${staggered.getStaggerDelay(i)}ms` }}
 *       />
 *     ))}
 *   </div>
 * )
 * ```
 */

/**
 * CSS Animation Classes Available:
 * 
 * Base Animations:
 * - animate-shimmer: Moving light effect across skeleton
 * - animate-pulse-wave: Gentle breathing effect
 * - animate-fade-in-up: Fade in while sliding up
 * - animate-skeleton-glow: Subtle glow animation
 * 
 * Skeleton Variants:
 * - skeleton-primary: Spa pink themed skeleton
 * - skeleton-secondary: Light pink themed skeleton
 * - skeleton-success: Green themed skeleton (for success states)
 * 
 * Stagger Delays:
 * - skeleton-stagger-1 through skeleton-stagger-5 (100ms increments)
 * 
 * Component Classes:
 * - service-card-skeleton: Full service card loading state
 * - staff-card-skeleton: Staff member card loading state
 * - time-slot-skeleton: Time selection loading state
 * - booking-summary-skeleton: Booking summary loading state
 * - dashboard-skeleton: Admin dashboard loading state
 */

/**
 * Accessibility Features:
 * 
 * - Respects prefers-reduced-motion user preference
 * - No flashing animations (seizure-safe)
 * - Screen reader compatible with proper ARIA labels
 * - High contrast support
 * - Touch-friendly sizing on mobile devices
 * - Consistent focus management
 */

/**
 * Performance Optimizations:
 * 
 * - CSS-based animations for smooth 60fps performance
 * - Efficient gradient animations using transform properties
 * - Minimal DOM manipulation
 * - Optimized for mobile devices
 * - Uses will-change sparingly to avoid memory issues
 * - Cleanup timeouts properly to prevent memory leaks
 */

export type SkeletonVariant = 'default' | 'primary' | 'secondary' | 'success'

export interface SkeletonProps {
  className?: string
  variant?: SkeletonVariant
  animate?: boolean
  'aria-label'?: string
}

export interface SkeletonLoadingState {
  isLoading: boolean
  showSkeleton: boolean
  startLoading: () => void
  stopLoading: () => void
  setLoading: (loading: boolean) => void
}

export interface StaggeredSkeletonState {
  visibleItems: number[]
  startStaggered: () => void
  stopStaggered: () => void
  isItemVisible: (index: number) => boolean
  getStaggerDelay: (index: number) => number
}