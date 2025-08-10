'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FloatingInput } from '@/components/ui/floating-input'
import { FloatingTextarea } from '@/components/ui/floating-textarea'
import { Label } from '@/components/ui/label'
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
    watch
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
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-primary-dark mb-6">
        Customer Information
      </h2>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Name */}
        <FloatingInput
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          isRequired={true}
          success={getFieldStatus('name') === 'success'}
          error={errors.name?.message}
          helperText={getFieldStatus('name') === 'success' ? 'Looks good!' : undefined}
          value={formData.name}
          {...register('name')}
        />

        {/* Customer Email */}
        <FloatingInput
          label="Email Address"
          type="email"
          placeholder="Enter your email address"
          isRequired={true}
          success={getFieldStatus('email') === 'success'}
          error={errors.email?.message}
          helperText={getFieldStatus('email') === 'success' 
            ? 'Valid email address' 
            : "We'll send your booking confirmation to this email"
          }
          value={formData.email}
          {...register('email')}
        />

        {/* Customer Phone */}
        <FloatingInput
          label="Phone Number"
          type="tel"
          placeholder="Enter your phone number"
          isRequired={true}
          success={getFieldStatus('phone') === 'success'}
          error={errors.phone?.message}
          helperText={getFieldStatus('phone') === 'success' 
            ? 'Valid phone number' 
            : 'We may contact you if there are any changes to your appointment'
          }
          value={formData.phone}
          {...register('phone')}
        />

        {/* Special Requests */}
        <FloatingTextarea
          label="Special Requests (Optional)"
          placeholder="Any special requests, allergies, or preferences we should know about..."
          rows={4}
          maxLength={500}
          error={errors.specialRequests?.message}
          helperText="Tell us about any allergies, preferences, or special accommodations"
          value={formData.specialRequests}
          {...register('specialRequests')}
        />

        {/* Customer Status Checkbox */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="isNewCustomer"
              className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              {...register('isNewCustomer')}
            />
            <div>
              <Label htmlFor="isNewCustomer" className="text-sm font-medium text-gray-900 cursor-pointer">
                This is my first visit to Dermal Skin Clinic
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                New customers require a $30 deposit to secure their booking. 
                Existing customers can choose to pay a deposit or pay on location.
              </p>
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