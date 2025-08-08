/**
 * Motion and Animation Utilities for Admin Panel
 * Provides consistent motion preferences and accessibility support
 */

export const motionClasses = {
  // Reduced motion support
  reduceMotion: "motion-reduce:transition-none motion-reduce:animate-none motion-reduce:hover:transform-none",
  
  // Standard transitions
  transition: {
    fast: "transition-all duration-150 ease-out",
    base: "transition-all duration-300 ease-out", 
    slow: "transition-all duration-500 ease-out",
    colors: "transition-colors duration-200 ease-out"
  },
  
  // Hover effects
  hover: {
    lift: "hover:shadow-lg hover:-translate-y-0.5",
    scale: "hover:scale-105",
    scaleSmall: "hover:scale-102",
    glow: (color: string = "gray") => `hover:shadow-lg hover:shadow-${color}-200/40`
  },
  
  // Active states
  active: {
    press: "active:translate-y-0 active:shadow-sm active:scale-95"
  },
  
  // Animations
  animation: {
    fadeIn: "animate-in fade-in duration-500",
    slideUp: "animate-in slide-in-from-bottom-4 fade-in duration-500",
    slideDown: "animate-in slide-in-from-top-4 fade-in duration-500",
    bounce: "animate-bounce",
    pulse: "animate-pulse",
    ping: "animate-ping"
  }
}

// Button micro-interaction classes
export const buttonClasses = {
  primary: [
    motionClasses.transition.base,
    motionClasses.hover.lift,
    motionClasses.hover.glow('primary'),
    motionClasses.active.press,
    motionClasses.reduceMotion
  ].join(' '),
  
  secondary: [
    motionClasses.transition.base,
    motionClasses.hover.lift,
    motionClasses.hover.glow('gray'),
    motionClasses.active.press,
    motionClasses.reduceMotion
  ].join(' ')
}

// Card micro-interaction classes
export const cardClasses = {
  interactive: [
    motionClasses.transition.base,
    motionClasses.hover.lift,
    motionClasses.hover.glow(),
    "hover:border-primary/30",
    motionClasses.active.press,
    motionClasses.reduceMotion,
    "group cursor-pointer"
  ].join(' '),
  
  static: [
    motionClasses.transition.base,
    motionClasses.hover.glow(),
    motionClasses.reduceMotion
  ].join(' ')
}

// Table row classes
export const tableRowClasses = [
  motionClasses.transition.base,
  "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/10",
  "hover:shadow-sm group cursor-pointer",
  motionClasses.reduceMotion
].join(' ')

// Status badge animation classes
export const statusBadgeClasses = [
  motionClasses.transition.base,
  motionClasses.hover.scaleSmall,
  "hover:shadow-sm cursor-default relative overflow-hidden",
  motionClasses.reduceMotion
].join(' ')

// Utility function to check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Hook for motion preferences (client-side only)
export const useMotionPreference = () => {
  const [reducedMotion, setReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return { reducedMotion }
}

// React import for useState and useEffect
import { useState, useEffect } from 'react'