'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioProps extends Omit<React.ComponentProps<"input">, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  error?: string
  showAnimations?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'error'
  name?: string
  value?: string
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
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
    name,
    value,
    ...props 
  }, ref) => {
    const [isAnimating, setIsAnimating] = React.useState(false)
    const [prevChecked, setPrevChecked] = React.useState(checked)
    const radioId = React.useId()

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

    const getDotSize = () => {
      switch (size) {
        case 'sm':
          return 'w-1.5 h-1.5'
        case 'lg':
          return 'w-3 h-3'
        default:
          return 'w-2 h-2'
      }
    }

    const getVariantClasses = () => {
      if (error || variant === 'error') {
        return checked 
          ? 'border-red-500'
          : 'border-red-400 hover:border-red-500'
      }
      
      if (variant === 'success') {
        return checked 
          ? 'border-green-500'
          : 'border-green-400 hover:border-green-500'
      }
      
      return checked 
        ? 'border-primary'
        : 'border-gray-300 hover:border-primary'
    }

    const getDotColor = () => {
      if (error || variant === 'error') {
        return 'bg-red-500'
      }
      
      if (variant === 'success') {
        return 'bg-green-500'
      }
      
      return 'bg-primary'
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      if (!disabled && !checked) {
        onCheckedChange?.(true)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!disabled && !checked) {
          onCheckedChange?.(true)
        }
      }
    }

    return (
      <div className="relative inline-flex items-start gap-3">
        <div className="flex items-center">
          <input
            type="radio"
            id={radioId}
            className="sr-only"
            ref={ref}
            checked={checked}
            onChange={handleInputChange}
            disabled={disabled}
            name={name}
            value={value}
            {...props}
          />
          
          <div
            className={cn(
              // Base styling
              "relative inline-flex items-center justify-center rounded-full border-2 bg-white",
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
            role="radio"
            aria-checked={checked}
            aria-labelledby={label ? `${radioId}-label` : undefined}
            aria-describedby={error ? `${radioId}-error` : undefined}
          >
            {checked && (
              <div 
                className={cn(
                  "rounded-full transition-all duration-200 ease-out",
                  getDotSize(),
                  getDotColor(),
                  showAnimations && isAnimating && "animate-radio-check"
                )}
              />
            )}
          </div>
        </div>

        {/* Label */}
        {label && (
          <label
            id={`${radioId}-label`}
            htmlFor={radioId}
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
            id={`${radioId}-error`}
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

Radio.displayName = "Radio"

// RadioGroup component for managing a group of radio buttons
interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
  error?: string
  showAnimations?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'error'
  name: string
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  children,
  className,
  error,
  showAnimations = true,
  size = 'md',
  variant = 'default',
  name
}) => {
  const handleRadioChange = (radioValue: string) => {
    onValueChange?.(radioValue)
  }

  return (
    <div className={cn("space-y-3", className)} role="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement<RadioProps>(child) && child.type === Radio) {
          return React.cloneElement(child, {
            checked: value === child.props.value,
            onCheckedChange: (checked: boolean) => {
              if (checked && child.props.value) {
                handleRadioChange(child.props.value)
              }
            },
            error: error,
            showAnimations,
            size,
            variant: error ? 'error' : variant,
            name
          })
        }
        return child
      })}
      
      {/* Group error message */}
      {error && (
        <div
          className={cn(
            "mt-2",
            showAnimations ? "animate-fade-slide-in" : ""
          )}
        >
          <div className="error-message text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

RadioGroup.displayName = "RadioGroup"

export { Radio, RadioGroup, type RadioProps }