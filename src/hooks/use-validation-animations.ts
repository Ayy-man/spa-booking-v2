'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type ValidationState = 'default' | 'typing' | 'success' | 'error'

export interface UseValidationAnimationsOptions {
  debounceMs?: number
  showAnimations?: boolean
  onStateChange?: (state: ValidationState) => void
}

export interface ValidationAnimationState {
  validationState: ValidationState
  isTyping: boolean
  shouldShake: boolean
  isAnimating: boolean
  hasValue: boolean
}

/**
 * Hook for managing validation animations and states
 * Provides smooth transitions between validation states with proper debouncing
 */
export function useValidationAnimations(
  value: string | undefined,
  error: string | undefined,
  success: boolean = false,
  options: UseValidationAnimationsOptions = {}
) {
  const {
    debounceMs = 300,
    showAnimations = true,
    onStateChange
  } = options

  const [isTyping, setIsTyping] = useState(false)
  const [shouldShake, setShouldShake] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevError, setPrevError] = useState(error)

  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const shakeTimeoutRef = useRef<NodeJS.Timeout>()
  const animationTimeoutRef = useRef<NodeJS.Timeout>()

  const hasValue = Boolean(value && value.length > 0)

  // Handle typing state with debouncing
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, debounceMs)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [isTyping, debounceMs])

  // Handle shake animation when error changes
  useEffect(() => {
    if (showAnimations && error && error !== prevError) {
      setShouldShake(true)

      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current)
      }

      shakeTimeoutRef.current = setTimeout(() => {
        setShouldShake(false)
      }, 500)
    }
    setPrevError(error)

    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current)
      }
    }
  }, [error, prevError, showAnimations])

  // Handle general animation state
  useEffect(() => {
    if (showAnimations && (shouldShake || (success && hasValue))) {
      setIsAnimating(true)

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }

      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
      }, 300)
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [shouldShake, success, hasValue, showAnimations])

  // Determine current validation state
  const getValidationState = useCallback((): ValidationState => {
    if (error) return 'error'
    if (success && hasValue) return 'success'
    if (isTyping) return 'typing'
    return 'default'
  }, [error, success, hasValue, isTyping])

  const validationState = getValidationState()

  // Handle state change callback
  useEffect(() => {
    onStateChange?.(validationState)
  }, [validationState, onStateChange])

  // Function to trigger typing state (call this in input onChange)
  const handleInputChange = useCallback(() => {
    setIsTyping(true)
  }, [])

  // Function to reset all animation states
  const resetAnimations = useCallback(() => {
    setIsTyping(false)
    setShouldShake(false)
    setIsAnimating(false)
  }, [])

  // Generate CSS classes for animations
  const getAnimationClasses = useCallback(() => {
    if (!showAnimations) return ''

    const classes = []

    if (shouldShake) {
      classes.push('animate-shake-error')
    }

    if (validationState === 'success' && hasValue && isAnimating) {
      classes.push('animate-success-pulse')
    }

    if (validationState === 'error' && isAnimating) {
      classes.push('animate-error-pulse')
    }

    return classes.join(' ')
  }, [shouldShake, validationState, hasValue, isAnimating, showAnimations])

  // Generate CSS classes for validation states
  const getValidationStateClasses = useCallback(() => {
    const baseClasses = 'input-validation-state'

    switch (validationState) {
      case 'success':
        return `${baseClasses} input-success`
      case 'error':
        return `${baseClasses} input-error`
      case 'typing':
        return `${baseClasses} input-typing`
      default:
        return baseClasses
    }
  }, [validationState])

  return {
    // State
    validationState,
    isTyping,
    shouldShake,
    isAnimating,
    hasValue,

    // Functions
    handleInputChange,
    resetAnimations,
    getAnimationClasses,
    getValidationStateClasses,

    // Raw state for custom usage
    state: {
      validationState,
      isTyping,
      shouldShake,
      isAnimating,
      hasValue
    } as ValidationAnimationState
  }
}

/**
 * Hook for managing form-level validation animations
 * Useful for coordinating animations across multiple fields
 */
export function useFormValidationAnimations(showAnimations: boolean = true) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [globalError, setGlobalError] = useState<string>()

  const handleSubmit = useCallback(async (submitFn: () => Promise<void>) => {
    setIsSubmitting(true)
    setHasSubmitted(true)
    
    try {
      await submitFn()
      setGlobalError(undefined)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setIsSubmitting(false)
    setHasSubmitted(false)
    setGlobalError(undefined)
  }, [])

  return {
    isSubmitting,
    hasSubmitted,
    globalError,
    showAnimations,
    handleSubmit,
    resetForm,
    setGlobalError
  }
}

/**
 * Hook for managing reduced motion preferences
 * Automatically detects user's motion preferences and provides appropriate defaults
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  return {
    prefersReducedMotion,
    shouldShowAnimations: !prefersReducedMotion
  }
}

/**
 * Utility function to check if animations should be shown
 * Takes into account both user preference and global animation settings
 */
export function shouldShowAnimations(
  showAnimations: boolean = true,
  prefersReducedMotion?: boolean
): boolean {
  if (typeof window === 'undefined') return false
  
  const userPrefersReduced = prefersReducedMotion ?? 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  return showAnimations && !userPrefersReduced
}