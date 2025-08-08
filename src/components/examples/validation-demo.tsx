'use client'

import * as React from "react"
import { FloatingInput } from "@/components/ui/floating-input"
import { FloatingTextarea } from "@/components/ui/floating-textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { ErrorMessage, ValidationMessage } from "@/components/ui/error-message"
import { useValidationAnimations, useReducedMotion } from "@/hooks/use-validation-animations"
import { validateField, bookingValidations, RealTimeValidator } from "@/lib/validation-utils"
import { cn } from "@/lib/utils"

interface ValidationDemoState {
  firstName: string
  email: string
  phone: string
  specialRequests: string
  newsletter: boolean
  communicationPreference: string
  termsAccepted: boolean
}

/**
 * Comprehensive validation demo showing all animation features
 * This component demonstrates how to use all validation animations
 */
export function ValidationDemo() {
  const { shouldShowAnimations } = useReducedMotion()
  
  const [formData, setFormData] = React.useState<ValidationDemoState>({
    firstName: '',
    email: '',
    phone: '',
    specialRequests: '',
    newsletter: false,
    communicationPreference: '',
    termsAccepted: false
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState(false)
  
  // Real-time validator
  const validator = React.useMemo(
    () => new RealTimeValidator(bookingValidations.customerInfo),
    []
  )

  // Cleanup validator on unmount
  React.useEffect(() => {
    return () => validator.cleanup()
  }, [validator])

  // Validation animations for each field
  const firstNameValidation = useValidationAnimations(
    formData.firstName,
    errors.firstName,
    formData.firstName.length > 0 && !errors.firstName,
    { showAnimations: shouldShowAnimations }
  )

  const emailValidation = useValidationAnimations(
    formData.email,
    errors.email,
    formData.email.length > 0 && !errors.email,
    { showAnimations: shouldShowAnimations }
  )

  const phoneValidation = useValidationAnimations(
    formData.phone,
    errors.phone,
    formData.phone.length > 0 && !errors.phone,
    { showAnimations: shouldShowAnimations }
  )

  const specialRequestsValidation = useValidationAnimations(
    formData.specialRequests,
    errors.specialRequests,
    formData.specialRequests.length > 0 && !errors.specialRequests,
    { showAnimations: shouldShowAnimations }
  )

  // Handle input changes with validation
  const handleInputChange = (field: keyof ValidationDemoState) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setFormData(prev => ({ ...prev, [field]: value }))

      // Trigger typing animation
      if (field === 'firstName') firstNameValidation.handleInputChange()
      if (field === 'email') emailValidation.handleInputChange()
      if (field === 'phone') phoneValidation.handleInputChange()
      if (field === 'specialRequests') specialRequestsValidation.handleInputChange()

      // Real-time validation with debouncing
      if (field in bookingValidations.customerInfo) {
        validator.validateField(
          field,
          value,
          (result) => {
            setErrors(prev => ({
              ...prev,
              [field]: result.error || ''
            }))
          }
        )
      }
    }

  // Handle checkbox changes
  const handleCheckboxChange = (field: keyof ValidationDemoState) =>
    (checked: boolean) => {
      setFormData(prev => ({ ...prev, [field]: checked }))
      
      // Clear any validation errors for checkboxes
      if (field === 'termsAccepted') {
        setErrors(prev => ({ ...prev, [field]: '' }))
      }
    }

  // Handle radio group change
  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, communicationPreference: value }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    // Validate all fields immediately
    const newErrors: Record<string, string> = {}

    // Validate required checkboxes
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and conditions'
    }

    if (!formData.communicationPreference) {
      newErrors.communicationPreference = 'Please select a communication preference'
    }

    // Validate text fields
    Object.entries(bookingValidations.customerInfo).forEach(([field, validation]) => {
      const value = formData[field as keyof ValidationDemoState] as string || ''
      const result = validateField(value, validation)
      if (result.error) {
        newErrors[field] = result.error
      }
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      // Success! Show success message
      alert('Form submitted successfully with beautiful animations!')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="mb-8">
        <h2 className="font-heading text-3xl text-primary-dark mb-2">
          Validation Animation Demo
        </h2>
        <p className="text-gray-600">
          Experience smooth, spa-like validation animations. Try typing in the fields, 
          leaving them empty, or entering invalid data to see the animations in action.
        </p>
        
        {!shouldShowAnimations && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <strong>Note:</strong> Animations are disabled due to your reduced motion preference.
            The validation still works, just without the animations.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form-spacing">
        {/* First Name Field */}
        <div>
          <FloatingInput
            label="First Name"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={errors.firstName}
            success={firstNameValidation.validationState === 'success'}
            isRequired
            showValidationAnimations={shouldShowAnimations}
            className={cn(
              firstNameValidation.getValidationStateClasses(),
              firstNameValidation.getAnimationClasses()
            )}
          />
        </div>

        {/* Email Field */}
        <div>
          <FloatingInput
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={errors.email}
            success={emailValidation.validationState === 'success'}
            isRequired
            showValidationAnimations={shouldShowAnimations}
            className={cn(
              emailValidation.getValidationStateClasses(),
              emailValidation.getAnimationClasses()
            )}
          />
        </div>

        {/* Phone Field */}
        <div>
          <FloatingInput
            type="tel"
            label="Phone Number"
            value={formData.phone}
            onChange={handleInputChange('phone')}
            error={errors.phone}
            success={phoneValidation.validationState === 'success'}
            isRequired
            showValidationAnimations={shouldShowAnimations}
            helperText="Include country code if international"
            className={cn(
              phoneValidation.getValidationStateClasses(),
              phoneValidation.getAnimationClasses()
            )}
          />
        </div>

        {/* Special Requests Textarea */}
        <div>
          <FloatingTextarea
            label="Special Requests"
            value={formData.specialRequests}
            onChange={handleInputChange('specialRequests')}
            error={errors.specialRequests}
            success={specialRequestsValidation.validationState === 'success'}
            showValidationAnimations={shouldShowAnimations}
            maxLength={500}
            rows={3}
            helperText="Any special accommodations or requests (optional)"
            className={cn(
              specialRequestsValidation.getValidationStateClasses(),
              specialRequestsValidation.getAnimationClasses()
            )}
          />
        </div>

        {/* Newsletter Checkbox */}
        <div>
          <Checkbox
            checked={formData.newsletter}
            onCheckedChange={handleCheckboxChange('newsletter')}
            label="Subscribe to our newsletter for spa updates and offers"
            showAnimations={shouldShowAnimations}
          />
        </div>

        {/* Communication Preference Radio Group */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preferred Communication Method <span className="text-red-500">*</span>
          </label>
          
          <RadioGroup
            value={formData.communicationPreference}
            onValueChange={handleRadioChange}
            name="communication"
            error={errors.communicationPreference}
            showAnimations={shouldShowAnimations}
          >
            <Radio
              value="email"
              label="Email"
              showAnimations={shouldShowAnimations}
            />
            <Radio
              value="phone"
              label="Phone Call"
              showAnimations={shouldShowAnimations}
            />
            <Radio
              value="sms"
              label="Text Message"
              showAnimations={shouldShowAnimations}
            />
          </RadioGroup>
        </div>

        {/* Terms Acceptance Checkbox */}
        <div>
          <Checkbox
            checked={formData.termsAccepted}
            onCheckedChange={handleCheckboxChange('termsAccepted')}
            label="I accept the terms and conditions"
            error={errors.termsAccepted}
            showAnimations={shouldShowAnimations}
            variant={errors.termsAccepted ? 'error' : 'default'}
          />
        </div>

        {/* Global Error Message */}
        {submitted && Object.keys(errors).length > 0 && (
          <ErrorMessage
            message="Please correct the errors above before submitting."
            type="error"
            showAnimation={shouldShowAnimations}
            dismissible
            onDismiss={() => setSubmitted(false)}
          />
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className={cn(
              "btn-primary-premium w-full",
              shouldShowAnimations && "transition-all duration-300 ease-out"
            )}
          >
            Submit Form
          </button>
        </div>

        {/* Demo Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <h3 className="font-semibold text-gray-800 mb-2">Try These Interactions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Type in a field and watch the gentle typing animation</li>
            <li>• Enter invalid data to see the error shake animation</li>
            <li>• Enter valid data to see the success pulse animation</li>
            <li>• Check/uncheck boxes to see smooth check animations</li>
            <li>• Submit with errors to see error message slide-ins</li>
            <li>• All animations respect your motion preferences</li>
          </ul>
        </div>
      </form>
    </div>
  )
}

/**
 * Minimal example showing basic usage
 */
export function SimpleValidationExample() {
  const { shouldShowAnimations } = useReducedMotion()
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState('')

  const validation = useValidationAnimations(
    email,
    error,
    email.includes('@') && !error,
    { showAnimations: shouldShowAnimations }
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    validation.handleInputChange()

    // Simple email validation
    if (value.length > 0 && !value.includes('@')) {
      setError('Please enter a valid email')
    } else {
      setError('')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <h3 className="font-semibold text-gray-800 mb-4">Simple Example</h3>
      
      <FloatingInput
        type="email"
        label="Email Address"
        value={email}
        onChange={handleChange}
        error={error}
        success={validation.validationState === 'success'}
        showValidationAnimations={shouldShowAnimations}
        className={cn(
          validation.getValidationStateClasses(),
          validation.getAnimationClasses()
        )}
      />
    </div>
  )
}