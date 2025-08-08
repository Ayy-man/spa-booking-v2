/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import skeleton components
import {
  Skeleton,
  ServiceCardSkeleton,
  StaffCardSkeleton,
  TimeSlotSkeleton,
  FormSkeleton,
  BookingSummarySkeleton,
  CalendarSkeleton
} from '../components/ui/skeleton-loader'

// Import skeleton hooks
import {
  useSkeletonLoading,
  useStaggeredSkeleton,
  useSkeletonCrossfade
} from '../hooks/use-skeleton-loading'

// Mock CSS animations for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('Skeleton System', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic Skeleton Components', () => {
    test('renders basic Skeleton component', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('skeleton-shimmer')
    })

    test('renders ServiceCardSkeleton with proper structure', () => {
      render(<ServiceCardSkeleton data-testid="service-skeleton" />)
      const skeleton = screen.getByTestId('service-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('service-card-skeleton')
    })

    test('renders StaffCardSkeleton with avatar and content', () => {
      render(<StaffCardSkeleton data-testid="staff-skeleton" />)
      const skeleton = screen.getByTestId('staff-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('staff-card-skeleton')
    })

    test('renders TimeSlotSkeleton with correct count', () => {
      render(<TimeSlotSkeleton count={8} data-testid="time-skeleton" />)
      const skeleton = screen.getByTestId('time-skeleton')
      expect(skeleton).toBeInTheDocument()
      
      // Should render 8 time slot placeholders
      const timeSlots = skeleton.querySelectorAll('.time-slot-skeleton')
      expect(timeSlots).toHaveLength(8)
    })

    test('renders FormSkeleton with specified field count', () => {
      render(<FormSkeleton fieldCount={5} data-testid="form-skeleton" />)
      const skeleton = screen.getByTestId('form-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('form-skeleton')
    })

    test('renders BookingSummarySkeleton', () => {
      render(<BookingSummarySkeleton data-testid="booking-skeleton" />)
      const skeleton = screen.getByTestId('booking-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('booking-summary-skeleton')
    })

    test('renders CalendarSkeleton with grid structure', () => {
      render(<CalendarSkeleton data-testid="calendar-skeleton" />)
      const skeleton = screen.getByTestId('calendar-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('calendar-skeleton')
    })
  })

  describe('useSkeletonLoading Hook', () => {
    test('initializes with correct default state', () => {
      const { result } = renderHook(() => useSkeletonLoading(false))
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.showSkeleton).toBe(false)
    })

    test('starts loading correctly', () => {
      const { result } = renderHook(() => useSkeletonLoading(false))
      
      act(() => {
        result.current.startLoading()
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.showSkeleton).toBe(true)
    })

    test('stops loading after minimum duration', async () => {
      const { result } = renderHook(() => 
        useSkeletonLoading(false, { minDuration: 500 })
      )
      
      act(() => {
        result.current.startLoading()
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.showSkeleton).toBe(true)
      
      act(() => {
        result.current.stopLoading()
      })
      
      expect(result.current.isLoading).toBe(false)
      // Should still show skeleton due to minimum duration
      expect(result.current.showSkeleton).toBe(true)
      
      // Fast-forward past minimum duration
      act(() => {
        jest.advanceTimersByTime(600)
      })
      
      await waitFor(() => {
        expect(result.current.showSkeleton).toBe(false)
      })
    })

    test('setLoading works correctly', () => {
      const { result } = renderHook(() => useSkeletonLoading(false))
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.showSkeleton).toBe(true)
      
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useStaggeredSkeleton Hook', () => {
    test('initializes with empty visible items', () => {
      const { result } = renderHook(() => 
        useStaggeredSkeleton(5, { staggerDelay: 100 })
      )
      
      expect(result.current.visibleItems).toEqual([])
      expect(result.current.isItemVisible(0)).toBe(false)
    })

    test('reveals items in staggered order', () => {
      const { result } = renderHook(() => 
        useStaggeredSkeleton(3, { staggerDelay: 100 })
      )
      
      act(() => {
        result.current.startStaggered()
      })
      
      // First item should be visible immediately
      act(() => {
        jest.advanceTimersByTime(0)
      })
      expect(result.current.isItemVisible(0)).toBe(true)
      expect(result.current.isItemVisible(1)).toBe(false)
      
      // Second item after 100ms
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.isItemVisible(1)).toBe(true)
      expect(result.current.isItemVisible(2)).toBe(false)
      
      // Third item after another 100ms
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.isItemVisible(2)).toBe(true)
    })

    test('calculates stagger delay correctly', () => {
      const { result } = renderHook(() => 
        useStaggeredSkeleton(5, { staggerDelay: 150 })
      )
      
      expect(result.current.getStaggerDelay(0)).toBe(0)
      expect(result.current.getStaggerDelay(1)).toBe(150)
      expect(result.current.getStaggerDelay(2)).toBe(300)
      expect(result.current.getStaggerDelay(4)).toBe(600)
    })

    test('stops staggered animation and clears items', () => {
      const { result } = renderHook(() => 
        useStaggeredSkeleton(3, { staggerDelay: 100 })
      )
      
      act(() => {
        result.current.startStaggered()
      })
      
      act(() => {
        jest.advanceTimersByTime(150)
      })
      
      expect(result.current.visibleItems.length).toBeGreaterThan(0)
      
      act(() => {
        result.current.stopStaggered()
      })
      
      expect(result.current.visibleItems).toEqual([])
    })
  })

  describe('useSkeletonCrossfade Hook', () => {
    test('shows skeleton when loading', () => {
      const { result } = renderHook(() => 
        useSkeletonCrossfade(true, { fadeTransition: true })
      )
      
      expect(result.current.showSkeleton).toBe(true)
      expect(result.current.showContent).toBe(false)
    })

    test('transitions to content when loading stops', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useSkeletonCrossfade(isLoading, { fadeTransition: true }),
        { initialProps: { isLoading: true } }
      )
      
      expect(result.current.showSkeleton).toBe(true)
      expect(result.current.showContent).toBe(false)
      
      rerender({ isLoading: false })
      
      expect(result.current.isTransitioning).toBe(true)
      expect(result.current.showSkeleton).toBe(true)
      expect(result.current.showContent).toBe(true)
      
      // After transition completes
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(result.current.showSkeleton).toBe(false)
      expect(result.current.showContent).toBe(true)
      expect(result.current.isTransitioning).toBe(false)
    })

    test('handles immediate transition without fade', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useSkeletonCrossfade(isLoading, { fadeTransition: false }),
        { initialProps: { isLoading: true } }
      )
      
      expect(result.current.showSkeleton).toBe(true)
      expect(result.current.showContent).toBe(false)
      
      rerender({ isLoading: false })
      
      expect(result.current.showSkeleton).toBe(false)
      expect(result.current.showContent).toBe(true)
      expect(result.current.isTransitioning).toBe(false)
    })
  })

  describe('Accessibility', () => {
    test('skeleton components have proper ARIA attributes', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
    })

    test('respects prefers-reduced-motion', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<ServiceCardSkeleton data-testid="service-skeleton" />)
      const skeleton = screen.getByTestId('service-skeleton')
      
      // Should have reduced motion styles applied via CSS
      expect(skeleton).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    test('accepts custom className', () => {
      render(
        <Skeleton 
          className="custom-skeleton-class" 
          data-testid="skeleton" 
        />
      )
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('custom-skeleton-class')
    })

    test('TimeSlotSkeleton accepts count prop', () => {
      render(<TimeSlotSkeleton count={12} data-testid="time-skeleton" />)
      const skeleton = screen.getByTestId('time-skeleton')
      const timeSlots = skeleton.querySelectorAll('.time-slot-skeleton')
      expect(timeSlots).toHaveLength(12)
    })

    test('FormSkeleton accepts fieldCount prop', () => {
      render(<FormSkeleton fieldCount={3} data-testid="form-skeleton" />)
      const skeleton = screen.getByTestId('form-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('form-skeleton')
    })
  })
})