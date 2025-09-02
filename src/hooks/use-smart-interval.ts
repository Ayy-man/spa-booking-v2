'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseSmartIntervalOptions {
  interval: number
  onlyWhenVisible?: boolean
  onlyWhenActive?: boolean
  activityTimeout?: number
}

/**
 * Smart interval hook that pauses when tab is hidden or user is inactive
 * Reduces unnecessary background processing and improves performance
 */
export function useSmartInterval(
  callback: () => void,
  options: UseSmartIntervalOptions
) {
  const {
    interval,
    onlyWhenVisible = true,
    onlyWhenActive = false,
    activityTimeout = 120000 // 2 minutes
  } = options
  
  const savedCallback = useRef<() => void>()
  const intervalId = useRef<NodeJS.Timeout | null>(null)
  const lastActivity = useRef(Date.now())
  
  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  // Track user activity if needed
  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now()
  }, [])
  
  // Check if user is active
  const isUserActive = useCallback(() => {
    return Date.now() - lastActivity.current < activityTimeout
  }, [activityTimeout])
  
  // Check if tab is visible
  const isTabVisible = useCallback(() => {
    return !document.hidden
  }, [])
  
  // Smart execution function
  const executeIfAllowed = useCallback(() => {
    const canExecute = 
      (!onlyWhenVisible || isTabVisible()) &&
      (!onlyWhenActive || isUserActive())
    
    if (canExecute && savedCallback.current) {
      savedCallback.current()
    }
  }, [onlyWhenVisible, onlyWhenActive, isTabVisible, isUserActive])
  
  useEffect(() => {
    // Set up activity tracking if needed
    if (onlyWhenActive) {
      const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove']
      events.forEach(event => {
        document.addEventListener(event, updateActivity)
      })
      
      // Initial activity
      updateActivity()
    }
    
    // Set up the interval
    intervalId.current = setInterval(executeIfAllowed, interval)
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && savedCallback.current) {
        // Execute immediately when tab becomes visible
        savedCallback.current()
      }
    }
    
    if (onlyWhenVisible) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    
    // Cleanup
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current)
      }
      
      if (onlyWhenActive) {
        const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove']
        events.forEach(event => {
          document.removeEventListener(event, updateActivity)
        })
      }
      
      if (onlyWhenVisible) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [interval, onlyWhenVisible, onlyWhenActive, executeIfAllowed, updateActivity])
  
  // Return a function to manually trigger the callback if needed
  return executeIfAllowed
}