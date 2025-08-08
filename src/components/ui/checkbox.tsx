'use client'

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type" | "size"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  error?: string
  showAnimations?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'error'
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    checked = false, 
    onCheckedChange, 
    onChange, 
    label,
    error,
    showAnimations = true,
    size = 'md',
    variant = 'default',
    disabled,
    ...props 
  }, ref) => {
    const [isAnimating, setIsAnimating] = React.useState(false)
    const [prevChecked, setPrevChecked] = React.useState(checked)
    const checkboxId = React.useId()

    // Handle check animation
    React.useEffect(() => {
      if (showAnimations && checked !== prevChecked) {
        setIsAnimating(true)
        const timer = setTimeout(() => {
          setIsAnimating(false)
        }, 300)
        
        setPrevChecked(checked)
        
        return () => clearTimeout(timer)
      }
    }, [checked, prevChecked, showAnimations])

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'w-4 h-4'
        case 'lg':
          return 'w-6 h-6'
        default:
          return 'w-5 h-5'
      }
    }

    const getCheckIconSize = () => {
      switch (size) {
        case 'sm':
          return 'w-2.5 h-2.5'
        case 'lg':
          return 'w-4 h-4'
        default:
          return 'w-3 h-3'
      }
    }

    const getVariantClasses = () => {
      if (error || variant === 'error') {
        return checked 
          ? 'bg-red-500 border-red-500 text-white'
          : 'border-red-400 hover:border-red-500'
      }
      
      if (variant === 'success') {
        return checked 
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-green-400 hover:border-green-500'
      }
      
      return checked 
        ? 'bg-primary border-primary text-white'
        : 'border-gray-300 hover:border-primary'
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!disabled) {
          onCheckedChange?.(!checked)
        }
      }
    }

    return (
      <div className="relative inline-flex items-start gap-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id={checkboxId}
            className="sr-only"
            ref={ref}
            checked={checked}
            onChange={handleInputChange}
            disabled={disabled}
            {...props}
          />
          
          <div
            className={cn(
              // Base styling
              "relative inline-flex items-center justify-center rounded-sm border-2 bg-white",
              "cursor-pointer transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              "focus-visible:ring-offset-2",
              
              // Size
              getSizeClasses(),
              
              // Variant and state styling
              getVariantClasses(),
              
              // Disabled state
              disabled && "cursor-not-allowed opacity-50",
              
              // Animation classes
              showAnimations && isAnimating && checked && "animate-bounce-in",
              
              className
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="checkbox"
            aria-checked={checked}
            aria-labelledby={label ? `${checkboxId}-label` : undefined}
            aria-describedby={error ? `${checkboxId}-error` : undefined}
          >
            {checked && (
              <Check 
                className={cn(
                  "text-current transition-all duration-200 ease-out",
                  getCheckIconSize(),
                  showAnimations && isAnimating && "animate-checkbox-check"
                )} 
                strokeWidth={3} 
              />
            )}
          </div>
        </div>

        {/* Label */}
        {label && (
          <label
            id={`${checkboxId}-label`}
            htmlFor={checkboxId}
            className={cn(
              "text-sm font-medium cursor-pointer select-none transition-colors duration-200",
              error ? "text-red-700" : "text-gray-700",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {label}
          </label>
        )}

        {/* Error message */}
        {error && (
          <div
            id={`${checkboxId}-error`}
            className={cn(
              "absolute top-full left-0 mt-1 w-full",
              showAnimations ? "animate-fade-slide-in" : ""
            )}
          >
            <div className="error-message text-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox, type CheckboxProps }