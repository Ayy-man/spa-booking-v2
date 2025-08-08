'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface SkeletonLoadingOptions {
  minDuration?: number // Minimum time to show skeleton (prevents flashing)
  staggerDelay?: number // Delay between items in staggered animations
  fadeTransition?: boolean // Enable fade transition from skeleton to content
}

interface SkeletonLoadingState {
  isLoading: boolean
  showSkeleton: boolean
  startLoading: () => void
  stopLoading: () => void
  setLoading: (loading: boolean) => void
}

/**
 * Hook for managing skeleton loading states with smooth transitions
 * Provides elegant loading experiences that prevent flash of loading content
 */
export function useSkeletonLoading(
  initialLoading: boolean = false,
  options: SkeletonLoadingOptions = {}
): SkeletonLoadingState {
  const {
    minDuration = 500, // Show skeleton for at least 500ms
    fadeTransition = true
  } = options

  const [isLoading, setIsLoading] = useState(initialLoading)
  const [showSkeleton, setShowSkeleton] = useState(initialLoading)
  const loadingStartTime = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const startLoading = useCallback(() => {
    loadingStartTime.current = Date.now()
    setIsLoading(true)
    setShowSkeleton(true)
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    
    const elapsed = Date.now() - loadingStartTime.current
    const remainingTime = Math.max(0, minDuration - elapsed)
    
    if (remainingTime > 0) {
      // Wait for minimum duration before hiding skeleton
      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(false)
      }, remainingTime)
    } else {
      // Hide skeleton immediately if minimum duration has passed
      if (fadeTransition) {
        // Small delay for fade transition
        timeoutRef.current = setTimeout(() => {
          setShowSkeleton(false)
        }, 150)
      } else {
        setShowSkeleton(false)
      }
    }
  }, [minDuration, fadeTransition])

  const handleSetLoading = useCallback((loading: boolean) => {
    if (loading) {
      startLoading()
    } else {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isLoading,
    showSkeleton,
    startLoading,
    stopLoading,
    setLoading: handleSetLoading
  }
}

/**
 * Hook for managing staggered skeleton animations
 * Useful for lists of items that should animate in sequence
 */
export function useStaggeredSkeleton(
  itemCount: number,
  options: SkeletonLoadingOptions = {}
) {
  const { staggerDelay = 150 } = options
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  
  const startStaggered = useCallback(() => {
    // Clear existing timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = []
    
    // Reset visible items
    setVisibleItems([])
    
    // Stagger the appearance of each item
    for (let i = 0; i < itemCount; i++) {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => [...prev, i])
      }, i * staggerDelay)
      
      timeoutsRef.current.push(timeout)
    }
  }, [itemCount, staggerDelay])
  
  const stopStaggered = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = []
    setVisibleItems([])
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])
  
  return {
    visibleItems,
    startStaggered,
    stopStaggered,
    isItemVisible: (index: number) => visibleItems.includes(index),
    getStaggerDelay: (index: number) => index * staggerDelay
  }
}

/**
 * Hook for managing skeleton to content crossfade transitions
 * Provides smooth transitions between skeleton and actual content
 */
export function useSkeletonCrossfade(isLoading: boolean, options: SkeletonLoadingOptions = {}) {
  const { fadeTransition = true } = options
  const [phase, setPhase] = useState<'skeleton' | 'transitioning' | 'content'>(
    isLoading ? 'skeleton' : 'content'
  )
  
  useEffect(() => {
    if (isLoading) {
      setPhase('skeleton')
    } else {
      if (fadeTransition) {
        setPhase('transitioning')
        const timeout = setTimeout(() => {
          setPhase('content')
        }, 300) // Transition duration
        
        return () => clearTimeout(timeout)
      } else {
        setPhase('content')
      }
    }
  }, [isLoading, fadeTransition])
  
  return {
    showSkeleton: phase === 'skeleton' || phase === 'transitioning',
    showContent: phase === 'content' || phase === 'transitioning',
    isTransitioning: phase === 'transitioning',
    skeletonOpacity: phase === 'transitioning' ? 0 : 1,
    contentOpacity: phase === 'skeleton' ? 0 : 1
  }
}

/**
 * Hook for managing skeleton loading with data fetching
 * Integrates skeleton states with common data fetching patterns
 */
export function useSkeletonWithData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: SkeletonLoadingOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const skeleton = useSkeletonLoading(true, options)
  
  const fetchData = useCallback(async () => {
    try {
      skeleton.startLoading()
      setError(null)
      
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      skeleton.stopLoading()
    }
  }, [fetchFn, skeleton])
  
  useEffect(() => {
    fetchData()
  }, dependencies)
  
  return {
    data,
    error,
    refetch: fetchData,
    ...skeleton
  }
}

export default useSkeletonLoading