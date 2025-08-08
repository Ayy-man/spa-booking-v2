'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

type ValidationState = 'default' | 'typing' | 'success' | 'error'

interface FloatingTextareaProps extends React.ComponentProps<"textarea"> {
  label: string
  error?: string
  success?: boolean
  helperText?: string
  isRequired?: boolean
  maxLength?: number
  validationState?: ValidationState
  showValidationAnimations?: boolean
  debounceMs?: number
  onValidationStateChange?: (state: ValidationState) => void
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    success = false,
    helperText, 
    isRequired = false, 
    value, 
    placeholder,
    maxLength,
    rows = 4,
    validationState = 'default',
    showValidationAnimations = true,
    debounceMs = 300,
    onValidationStateChange,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const [currentLength, setCurrentLength] = React.useState(0)
    const [isTyping, setIsTyping] = React.useState(false)
    const [shouldShake, setShouldShake] = React.useState(false)
    const [prevError, setPrevError] = React.useState(error)
    const textareaId = React.useId()
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>()
    const shakeTimeoutRef = React.useRef<NodeJS.Timeout>()

    // Check if field has value or is focused to determine label position
    const shouldFloatLabel = isFocused || hasValue || (value && String(value).length > 0)

    React.useEffect(() => {
      const valueStr = value ? String(value) : ''
      setHasValue(valueStr.length > 0)
      setCurrentLength(valueStr.length)
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

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      setHasValue(e.target.value.length > 0)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setHasValue(newValue.length > 0)
      setCurrentLength(newValue.length)
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
        {/* Textarea field */}
        <textarea
          id={textareaId}
          value={value}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            // Base styling with floating label support
            "floating-textarea peer w-full px-4 pt-6 pb-2 text-base font-medium bg-white resize-none",
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
          htmlFor={textareaId}
          className={cn(
            // Base label styling
            "absolute left-4 transition-all duration-200 ease-out pointer-events-none",
            "text-gray-500 font-medium select-none",
            
            // Floating state (when focused or has value)
            shouldFloatLabel ? [
              "top-2 text-xs translate-y-0 scale-100",
              // Color based on state
              isFocused && !error && "text-primary",
              error && "text-red-500"
            ] : [
              // Default state (label positioned for first line)
              "top-4 text-base"
            ]
          )}
        >
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Character counter and helper text container */}
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Error message */}
            {error && (
              <div 
                className={cn(
                  "error-message-container",
                  showValidationAnimations ? "animate-fade-slide-in" : "mb-2"
                )}
              >
                <div className="error-message">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {/* Success message */}
            {success && hasValue && !error && (
              <div 
                className={cn(
                  "success-message-container",
                  showValidationAnimations ? "animate-fade-slide-in" : "mb-2"
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
            
            {/* Helper text (only shown when no error) */}
            {!error && helperText && (
              <p className="text-sm text-gray-500 py-1">{helperText}</p>
            )}
          </div>

          {/* Character counter */}
          {maxLength && (
            <div className="flex-shrink-0">
              <span className={cn(
                "text-xs transition-colors duration-200",
                currentLength > maxLength * 0.9 ? "text-amber-600" : "text-gray-400",
                currentLength >= maxLength ? "text-red-600 font-medium" : ""
              )}>
                {currentLength}
                {maxLength && `/${maxLength}`}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

FloatingTextarea.displayName = "FloatingTextarea"

export { FloatingTextarea }