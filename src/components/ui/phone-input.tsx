"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { 
  formatGuamPhone, 
  unformatPhone, 
  validateGuamPhone,
  getPhoneValidationError,
  handlePhonePaste as utilHandlePhonePaste,
  handlePhoneInputChange,
  isPhoneComplete,
  normalizePhoneForDB
} from "@/lib/phone-utils"

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: string
  onChange?: (value: string, formatted: string, isValid: boolean) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  error?: boolean
  showError?: boolean
  errorMessage?: string
  autoFormat?: boolean
  returnRawValue?: boolean
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ 
    className, 
    value = '', 
    onChange,
    onBlur,
    error,
    showError = false,
    errorMessage,
    autoFormat = true,
    returnRawValue = false,
    disabled,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(() => 
      autoFormat ? formatGuamPhone(value) : value
    )
    const [previousValue, setPreviousValue] = React.useState(internalValue)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasBeenTouched, setHasBeenTouched] = React.useState(false)

    // Update internal value when prop value changes
    React.useEffect(() => {
      if (!isFocused) {
        setInternalValue(autoFormat ? formatGuamPhone(value) : value)
      }
    }, [value, autoFormat, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      
      // Allow clearing the input
      if (newValue === '') {
        setInternalValue('')
        setPreviousValue('')
        onChange?.('', '', false)
        return
      }

      // Only allow numeric input and formatting characters
      const cleaned = newValue.replace(/[^\d\(\)\s\-]/g, '')
      
      // Handle the change with smart formatting
      const formatted = autoFormat 
        ? handlePhoneInputChange(cleaned, previousValue)
        : cleaned

      setInternalValue(formatted)
      setPreviousValue(formatted)

      // Determine what value to return
      const rawValue = unformatPhone(formatted)
      const normalizedValue = normalizePhoneForDB(formatted)
      const isValid = validateGuamPhone(formatted)

      if (onChange) {
        const valueToReturn = returnRawValue ? normalizedValue : formatted
        onChange(valueToReturn, formatted, isValid)
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (!autoFormat) return

      const formatted = utilHandlePhonePaste(e)
      if (formatted !== null) {
        setInternalValue(formatted)
        setPreviousValue(formatted)
        
        const rawValue = unformatPhone(formatted)
        const normalizedValue = normalizePhoneForDB(formatted)
        const isValid = validateGuamPhone(formatted)
        
        if (onChange) {
          const valueToReturn = returnRawValue ? normalizedValue : formatted
          onChange(valueToReturn, formatted, isValid)
        }
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setHasBeenTouched(true)
      
      // Final formatting on blur
      if (autoFormat && internalValue) {
        const formatted = formatGuamPhone(internalValue)
        setInternalValue(formatted)
        setPreviousValue(formatted)
        
        const rawValue = unformatPhone(formatted)
        const normalizedValue = normalizePhoneForDB(formatted)
        const isValid = validateGuamPhone(formatted)
        
        if (onChange) {
          const valueToReturn = returnRawValue ? normalizedValue : formatted
          onChange(valueToReturn, formatted, isValid)
        }
      }
      
      onBlur?.(e)
    }

    const validationError = getPhoneValidationError(internalValue)
    const showValidationError = showError && hasBeenTouched && validationError
    const isValid = !validationError && internalValue.length > 0
    const isComplete = isPhoneComplete(internalValue)

    return (
      <div className="relative">
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={internalValue}
          onChange={handleChange}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={autoFormat ? "(671) XXX-XXXX" : "671XXXXXXX"}
          maxLength={autoFormat ? 14 : 10}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error || (showValidationError && !isFocused) ? "border-red-500 focus-visible:ring-red-500" : "",
            isComplete && isValid && !isFocused ? "border-green-500" : "",
            className
          )}
          {...props}
        />
        
        {/* Visual indicators */}
        {!isFocused && internalValue && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isComplete && isValid ? (
              <svg className="w-5 h-5 text-green-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            ) : showValidationError ? (
              <svg className="w-5 h-5 text-red-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            ) : null}
          </div>
        )}
        
        {/* Error message */}
        {showValidationError && !isFocused && (
          <p className="text-sm text-red-500 mt-1">
            {errorMessage || validationError}
          </p>
        )}
        
        {/* Success message */}
        {isComplete && isValid && !isFocused && !showValidationError && (
          <p className="text-sm text-green-600 mt-1">
            Valid Guam phone number
          </p>
        )}
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }