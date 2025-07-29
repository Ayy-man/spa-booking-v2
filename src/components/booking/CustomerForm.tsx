'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const customerFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]{10,15}$/.test(val), {
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
    formState: { errors, isValid },
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

  const handleFormSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = isValid && formData.name && formData.email

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-primary-dark mb-6">
        Customer Information
      </h2>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Full Name *
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            className={`
              transition-all duration-200
              ${errors.name 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }
            `}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Customer Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            className={`
              transition-all duration-200
              ${errors.email 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }
            `}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">
              {errors.email.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            We'll send your booking confirmation to this email
          </p>
        </div>

        {/* Customer Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number <span className="text-gray-400">(Optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
            className={`
              transition-all duration-200
              ${errors.phone 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }
            `}
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">
              {errors.phone.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
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
              focus:outline-none focus:ring-2
              ${errors.specialRequests 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-primary focus:ring-primary/20'
              }
            `}
            {...register('specialRequests')}
          />
          {errors.specialRequests && (
            <p className="text-sm text-red-600 mt-1">
              {errors.specialRequests.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Maximum 500 characters
          </p>
        </div>

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
                New customers require a $25 deposit to secure their booking. 
                Existing customers can book without a deposit.
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
          className={`
            w-full py-3 text-lg font-medium transition-all duration-200
            ${!isFormValid 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-black text-white hover:bg-gray-900 active:bg-gray-800'
            }
          `}
        >
          {isSubmitting || loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </div>
          ) : (
            'Continue'
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