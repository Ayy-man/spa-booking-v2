'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

type ValidationState = 'default' | 'typing' | 'success' | 'error'

interface FloatingInputProps extends React.ComponentProps<"input"> {
  label: string
  error?: string
  success?: boolean
  helperText?: string
  isRequired?: boolean
  validationState?: ValidationState
  showValidationAnimations?: boolean
  debounceMs?: number
  onValidationStateChange?: (state: ValidationState) => void
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ 
    className, 
    type, 
    label, 
    error, 
    success, 
    helperText, 
    isRequired = false, 
    value, 
    placeholder,
    validationState = 'default',
    showValidationAnimations = true,
    debounceMs = 300,
    onValidationStateChange,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const [isTyping, setIsTyping] = React.useState(false)
    const [shouldShake, setShouldShake] = React.useState(false)
    const [prevError, setPrevError] = React.useState(error)
    const inputId = React.useId()
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>()
    const shakeTimeoutRef = React.useRef<NodeJS.Timeout>()

    // Check if field has value or is focused to determine label position
    const shouldFloatLabel = isFocused || hasValue || (value && String(value).length > 0)

    React.useEffect(() => {
      setHasValue(value ? String(value).length > 0 : false)
    }, [value])

    // Handle typing state with debouncing
    React.useEffect(() => {
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
    React.useEffect(() => {
      if (showValidationAnimations && error && error !== prevError) {
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
    }, [error, prevError, showValidationAnimations])

    // Handle validation state changes
    React.useEffect(() => {
      let newState: ValidationState = 'default'
      
      if (error) {
        newState = 'error'
      } else if (success && hasValue) {
        newState = 'success'
      } else if (isTyping) {
        newState = 'typing'
      }
      
      if (newState !== validationState) {
        onValidationStateChange?.(newState)
      }
    }, [error, success, hasValue, isTyping, validationState, onValidationStateChange])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setHasValue(e.target.value.length > 0)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      setIsTyping(true)
      props.onChange?.(e)
    }

    // Determine input state for styling
    const getInputState = (): ValidationState => {
      if (error) return 'error'
      if (success && hasValue) return 'success'
      if (isTyping) return 'typing'
      return 'default'
    }

    const currentValidationState = getInputState()
    
    // Generate dynamic classes for animations
    const getAnimationClasses = () => {
      if (!showValidationAnimations) return ''
      
      const classes = []
      
      if (shouldShake) {
        classes.push('animate-shake-error')
      }
      
      if (currentValidationState === 'success' && hasValue) {
        classes.push('animate-success-pulse')
      }
      
      if (currentValidationState === 'error') {
        classes.push('animate-error-pulse')
      }
      
      return classes.join(' ')
    }
    
    // Generate validation state classes
    const getValidationStateClasses = () => {
      const baseClasses = 'input-validation-state'
      
      switch (currentValidationState) {
        case 'success':
          return `${baseClasses} input-success`
        case 'error':
          return `${baseClasses} input-error`
        case 'typing':
          return `${baseClasses} input-typing`
        default:
          return baseClasses
      }
    }

    return (
      <div className="relative">
        {/* Input field */}
        <input
          id={inputId}
          type={type}
          value={value}
          className={cn(
            // Base styling with floating label support
            "floating-input peer w-full px-4 pt-6 pb-2 text-base font-medium bg-white",
            "border-2 rounded-xl transition-all duration-200 ease-out",
            "focus:outline-none placeholder:opacity-0",
            
            // Default state
            "border-gray-300 text-gray-900",
            
            // Focused state with spa pink glow
            "focus:border-primary focus:ring-4 focus:ring-primary/20 focus:shadow-lg",
            "focus:shadow-primary/10",
            
            // Validation state classes
            getValidationStateClasses(),
            
            // Animation classes
            getAnimationClasses(),
            
            // Disabled state
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60",
            
            className
          )}
          placeholder={placeholder || label}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={inputId}
          className={cn(
            // Base label styling
            "absolute left-4 transition-all duration-200 ease-out pointer-events-none",
            "text-gray-500 font-medium select-none",
            
            // Floating state (when focused or has value)
            shouldFloatLabel ? [
              "top-2 text-xs translate-y-0 scale-100",
              // Color based on state
              isFocused && !error && "text-primary",
              error && "text-red-500",
              success && hasValue && !isFocused && "text-green-600"
            ] : [
              // Default state (label in center)
              "top-1/2 -translate-y-1/2 text-base"
            ]
          )}
        >
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* State icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {/* Success icon */}
          {success && hasValue && !error && (
            <svg 
              className="w-5 h-5 text-green-500 animate-in slide-in-from-right-2 duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          
          {/* Error icon */}
          {error && (
            <svg 
              className="w-5 h-5 text-red-500 animate-in slide-in-from-right-2 duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Helper text or error message */}
        {(error || helperText) && (
          <div 
            className={cn(
              "error-message-container",
              showValidationAnimations ? "animate-fade-slide-in" : "mt-2"
            )}
          >
            {error && (
              <div className="error-message">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {!error && helperText && (
              <p className="text-sm text-gray-500 py-1">{helperText}</p>
            )}
          </div>
        )}
        
        {/* Success message */}
        {success && hasValue && !error && (
          <div 
            className={cn(
              "success-message-container",
              showValidationAnimations ? "animate-fade-slide-in" : "mt-2"
            )}
          >
            <div className="success-message">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Valid input</span>
            </div>
          </div>
        )}
      </div>
    )
  }
)

FloatingInput.displayName = "FloatingInput"

export { FloatingInput }