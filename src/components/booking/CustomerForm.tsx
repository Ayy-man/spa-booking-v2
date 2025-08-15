'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading-spinner'

const customerFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .refine((val) => /^\+?[\d\s\-\(\)]{10,15}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  specialRequests: z.string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional(),
  isNewCustomer: z.boolean().default(false)
})

export type CustomerFormData = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void
  loading?: boolean
  initialData?: Partial<CustomerFormData>
}

export default function CustomerForm({ onSubmit, loading = false, initialData }: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
    setValue
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      specialRequests: initialData?.specialRequests || '',
      isNewCustomer: initialData?.isNewCustomer || false
    },
    mode: 'onChange'
  })

  const formData = watch()

  // Helper function to get field validation status
  const getFieldStatus = (fieldName: keyof CustomerFormData) => {
    const isTouched = touchedFields[fieldName]
    const hasError = errors[fieldName]
    const hasValue = formData[fieldName]
    
    if (!isTouched) return 'default'
    if (hasError) return 'error'
    if (hasValue && fieldName !== 'specialRequests' && fieldName !== 'isNewCustomer') return 'success'
    return 'default'
  }

  // Helper function to get input classes based on validation status
  const getInputClasses = (fieldName: keyof CustomerFormData) => {
    const status = getFieldStatus(fieldName)
    const baseClasses = 'input-field'
    
    switch (status) {
      case 'success':
        return `${baseClasses} input-field-success`
      case 'error':
        return `${baseClasses} input-field-error`
      default:
        return baseClasses
    }
  }

  const handleFormSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = isValid && formData.name && formData.email && formData.phone

  return (
    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-primary-dark dark:text-primary-light mb-6">
        Customer Information
      </h2>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name *
          </Label>
          <div className="relative">
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              className={getInputClasses('name')}
              {...register('name')}
            />
            {getFieldStatus('name') === 'success' && (
              <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {getFieldStatus('name') === 'error' && (
              <AlertCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-error" />
            )}
          </div>
          {errors.name && (
            <p className="text-sm text-error mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.name.message}
            </p>
          )}
          {getFieldStatus('name') === 'success' && (
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              Looks good!
            </p>
          )}
        </div>

        {/* Customer Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address *
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              className={getInputClasses('email')}
              {...register('email')}
            />
            {getFieldStatus('email') === 'success' && (
              <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {getFieldStatus('email') === 'error' && (
              <AlertCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-error" />
            )}
          </div>
          {errors.email && (
            <p className="text-sm text-error mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.email.message}
            </p>
          )}
          {getFieldStatus('email') === 'success' && (
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              Valid email address
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We&apos;ll send your booking confirmation to this email
          </p>
        </div>

        {/* Customer Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone Number *
          </Label>
          <div className="relative">
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              className={getInputClasses('phone')}
              {...register('phone')}
            />
            {getFieldStatus('phone') === 'success' && (
              <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {getFieldStatus('phone') === 'error' && (
              <AlertCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-error" />
            )}
          </div>
          {errors.phone && (
            <p className="text-sm text-error mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.phone.message}
            </p>
          )}
          {getFieldStatus('phone') === 'success' && (
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" />
              Valid phone number
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We may contact you if there are any changes to your appointment
          </p>
        </div>

        {/* Special Requests */}
        <div className="space-y-2">
          <Label htmlFor="specialRequests" className="text-sm font-medium text-gray-700">
            Special Requests <span className="text-gray-400">(Optional)</span>
          </Label>
          <textarea
            id="specialRequests"
            rows={4}
            placeholder="Any special requests, allergies, or preferences we should know about..."
            className={`
              w-full px-3 py-2 border rounded-lg resize-none transition-all duration-200
              focus:outline-none focus:ring-2 bg-white text-black placeholder-gray-500
              ${errors.specialRequests 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-black focus:ring-black/20'
              }
            `}
            {...register('specialRequests')}
          />
          {errors.specialRequests && (
            <p className="text-sm text-red-600 mt-1">
              {errors.specialRequests.message}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Maximum 500 characters
          </p>
        </div>

        {/* Customer Status - Yes/No Selection */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-5 rounded-xl border-2 border-amber-300 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <Label className="text-base font-semibold text-gray-900">
                Is this your first visit to Dermal Skin Clinic?
              </Label>
            </div>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="isNewCustomer"
                  value="true"
                  checked={formData.isNewCustomer === true}
                  onChange={() => setValue('isNewCustomer', true)}
                  className="sr-only peer"
                />
                <div className="py-3 px-4 bg-white rounded-lg border-2 border-gray-300 cursor-pointer text-center font-medium hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-primary-dark transition-all">
                  Yes
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="isNewCustomer"
                  value="false"
                  checked={formData.isNewCustomer === false}
                  onChange={() => setValue('isNewCustomer', false)}
                  className="sr-only peer"
                />
                <div className="py-3 px-4 bg-white rounded-lg border-2 border-gray-300 cursor-pointer text-center font-medium hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-primary-dark transition-all">
                  No
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            Privacy & Data Protection
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Your personal information will be used solely for booking management and 
            service delivery. We respect your privacy and will never share your details 
            with third parties. You can request data deletion at any time by contacting us.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting || loading}
          className="btn-primary"
        >
          {isSubmitting || loading ? (
            <ButtonLoading text="Processing..." />
          ) : (
            'Continue to Booking'
          )}
        </Button>

        {/* Required Fields Note */}
        <p className="text-xs text-gray-500 text-center">
          * Required fields
        </p>
      </form>
    </Card>
  )
}