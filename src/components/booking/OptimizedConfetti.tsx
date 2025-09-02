'use client'

import { memo, lazy, Suspense } from 'react'

// Lazy load the confetti component to reduce initial bundle size
const ConfettiExplosion = lazy(() => import('react-confetti-explosion'))

interface OptimizedConfettiProps {
  show: boolean
}

// Memoized confetti component that only re-renders when show prop changes
export const OptimizedConfetti = memo(function OptimizedConfetti({ show }: OptimizedConfettiProps) {
  if (!show) return null
  
  return (
    <Suspense fallback={null}>
      <ConfettiExplosion
        force={0.6}
        duration={3000}
        particleCount={100}
        width={1000}
      />
    </Suspense>
  )
})

OptimizedConfetti.displayName = 'OptimizedConfetti'