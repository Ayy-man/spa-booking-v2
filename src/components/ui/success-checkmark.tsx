'use client'

import React, { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

interface SuccessCheckmarkProps {
  isVisible: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'circle' | 'square' | 'minimal'
  color?: 'success' | 'primary' | 'custom'
  customColor?: string
  delay?: number
  duration?: number
  className?: string
  onAnimationComplete?: () => void
}

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', strokeWidth: 2 },
  md: { container: 'w-12 h-12', icon: 'w-6 h-6', strokeWidth: 2 },
  lg: { container: 'w-16 h-16', icon: 'w-8 h-8', strokeWidth: 3 },
  xl: { container: 'w-20 h-20', icon: 'w-10 h-10', strokeWidth: 3 }
}

const colorMap = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    icon: 'text-green-600',
    shadow: 'shadow-green-500/25'
  },
  primary: {
    bg: 'bg-primary/10',
    border: 'border-primary',
    icon: 'text-primary',
    shadow: 'shadow-primary/25'
  },
  custom: {
    bg: 'bg-gray-100',
    border: 'border-gray-500',
    icon: 'text-gray-600',
    shadow: 'shadow-gray-500/25'
  }
}

export function SuccessCheckmark({
  isVisible,
  size = 'md',
  variant = 'circle',
  color = 'success',
  customColor,
  delay = 0,
  duration = 600,
  className = '',
  onAnimationComplete
}: SuccessCheckmarkProps) {
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'expanding' | 'checking' | 'complete'>('idle')

  const sizeStyles = sizeMap[size]
  const colorStyles = colorMap[color]

  useEffect(() => {
    if (isVisible && animationPhase === 'idle') {
      const timer = setTimeout(() => {
        setAnimationPhase('expanding')
        
        setTimeout(() => {
          setAnimationPhase('checking')
          setShowCheckmark(true)
          
          setTimeout(() => {
            setAnimationPhase('complete')
            onAnimationComplete?.()
          }, duration * 0.6)
        }, duration * 0.4)
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [isVisible, animationPhase, delay, duration, onAnimationComplete])

  if (!isVisible && animationPhase === 'idle') return null

  const containerClasses = `
    ${sizeStyles.container}
    ${variant === 'circle' ? 'rounded-full' : variant === 'square' ? 'rounded-lg' : ''}
    ${colorStyles.bg}
    ${colorStyles.border}
    border-2
    flex items-center justify-center
    relative overflow-hidden
    ${animationPhase === 'expanding' ? 'animate-bounce-in' : ''}
    ${animationPhase === 'complete' ? `shadow-lg ${colorStyles.shadow}` : ''}
    ${className}
  `.trim()

  const checkmarkClasses = `
    ${sizeStyles.icon}
    ${colorStyles.icon}
    transition-all duration-300 ease-out
    ${showCheckmark ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
    ${animationPhase === 'checking' ? 'animate-checkmark-draw' : ''}
  `.trim()

  const customStyles = customColor ? {
    backgroundColor: `${customColor}20`,
    borderColor: customColor,
    color: customColor,
    boxShadow: animationPhase === 'complete' ? `0 10px 25px ${customColor}40` : undefined
  } : {}

  return (
    <div 
      className={containerClasses}
      style={customColor ? customStyles : {}}
    >
      {/* Background pulse effect */}
      {animationPhase === 'expanding' && (
        <div 
          className={`
            absolute inset-0 
            ${variant === 'circle' ? 'rounded-full' : variant === 'square' ? 'rounded-lg' : ''}
            ${colorStyles.bg}
            animate-ping
          `}
          style={customColor ? { backgroundColor: `${customColor}30` } : {}}
        />
      )}
      
      {/* Checkmark icon */}
      <Check 
        className={checkmarkClasses}
        strokeWidth={sizeStyles.strokeWidth}
        style={customColor ? { color: customColor } : {}}
      />
      
      {/* Success ripple effect */}
      {animationPhase === 'complete' && (
        <div 
          className={`
            absolute inset-0 
            ${variant === 'circle' ? 'rounded-full' : variant === 'square' ? 'rounded-lg' : ''}
            border-2 
            ${colorStyles.border}
            animate-ping
            opacity-75
          `}
          style={customColor ? { borderColor: customColor } : {}}
        />
      )}
    </div>
  )
}

// Animated checkmark for step completion
export function StepCheckmark({ 
  isCompleted, 
  stepNumber, 
  className = '' 
}: { 
  isCompleted: boolean
  stepNumber: number
  className?: string 
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Step number background */}
      <div 
        className={`
          w-12 h-12 rounded-full border-2 
          flex items-center justify-center
          font-semibold text-sm
          transition-all duration-500 ease-out
          ${isCompleted 
            ? 'bg-green-500 border-green-500 text-white scale-110 shadow-lg shadow-green-500/25' 
            : 'bg-white border-gray-300 text-gray-500'
          }
        `}
      >
        {isCompleted ? (
          <SuccessCheckmark
            isVisible={true}
            size="sm"
            variant="minimal"
            color="custom"
            customColor="#ffffff"
            className="absolute"
          />
        ) : (
          stepNumber
        )}
      </div>
      
      {/* Celebration particles */}
      {isCompleted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-1 h-1 bg-green-400 rounded-full
                animate-particle-explosion-${i}
              `}
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: '800ms'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Progress line with animated fill
export function ProgressLine({ 
  isCompleted, 
  className = '' 
}: { 
  isCompleted: boolean
  className?: string 
}) {
  return (
    <div className={`h-1 bg-gray-300 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`
          h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full
          transition-all duration-700 ease-out
          ${isCompleted ? 'w-full' : 'w-0'}
        `}
      >
        {isCompleted && (
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-shimmer" />
        )}
      </div>
    </div>
  )
}

export default SuccessCheckmark