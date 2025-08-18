'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading-spinner'
import { validateGuamPhone, normalizePhoneForDB } from '@/lib/phone-utils'

const walkInFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .transform((val) => normalizePhoneForDB(val))
    .refine((val) => validateGuamPhone(val), {
      message: 'Please enter a valid Guam phone number'
    }),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  service: z.string()
    .min(1, 'Please select a service'),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
})

export type WalkInFormData = z.infer<typeof walkInFormSchema>

interface Service {
  id: string
  name: string
  category: string
  duration: number
  price: number
}

interface WalkInFormProps {
  onSubmit: (data: WalkInFormData) => void
  loading?: boolean
}

export default function WalkInForm({ onSubmit, loading = false }: WalkInFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
    setValue,
    trigger
  } = useForm<WalkInFormData>({
    resolver: zodResolver(walkInFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      service: '',
      notes: ''
    },
    mode: 'onChange'
  })

  const formData = watch()

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services')
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } catch (error) {
        console.error('Failed to fetch services:', error)
      } finally {
        setLoadingServices(false)
      }
    }

    fetchServices()
  }, [])

  // Update selected service when service changes
  useEffect(() => {
    if (formData.service) {
      const service = services.find(s => s.id === formData.service)
      setSelectedService(service || null)
    }
  }, [formData.service, services])

  // Helper function to get field validation status
  const getFieldStatus = (fieldName: keyof WalkInFormData) => {
    const isTouched = touchedFields[fieldName]
    const hasError = errors[fieldName]
    const hasValue = formData[fieldName]
    
    if (!isTouched) return 'default'
    if (hasError) return 'error'
    if (hasValue && fieldName !== 'notes' && fieldName !== 'email') return 'success'
    return 'default'
  }

  // Helper function to get input classes based on validation status
  const getInputClasses = (fieldName: keyof WalkInFormData) => {
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

  const handleFormSubmit = async (data: WalkInFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = isValid && formData.name && formData.phone && formData.service

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-primary-dark mb-6">
        Walk-In Check-In
      </h2>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
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

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number *
          </Label>
          <PhoneInput
            id="phone"
            value={watch('phone') || ''}
            onChange={(rawValue, formatted, isValid) => {
              setValue('phone', rawValue, { 
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true 
              })
            }}
            onBlur={() => trigger('phone')}
            error={!!errors.phone}
            showError={true}
            errorMessage={errors.phone?.message}
            returnRawValue={true}
            className={getInputClasses('phone')}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address <span className="text-gray-400">(Optional)</span>
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
        </div>

        {/* Service Selection */}
        <div className="space-y-2">
          <Label htmlFor="service" className="text-sm font-medium text-gray-700">
            Service Requested *
          </Label>
          {loadingServices ? (
            <div className="h-10 bg-gray-100 animate-pulse rounded-md"></div>
          ) : (
            <Select onValueChange={(value) => setValue('service', value)} value={formData.service}>
              <SelectTrigger className={getInputClasses('service')}>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{service.name}</span>
                      <span className="text-sm text-gray-500 ml-4">
                        {service.duration}min • ${service.price}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.service && (
            <p className="text-sm text-error mt-1 flex items-center gap-1">
              <AlertCircleIcon className="w-4 h-4" />
              {errors.service.message}
            </p>
          )}
          {selectedService && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <div className="font-medium text-blue-900">{selectedService.name}</div>
              <div className="text-blue-700">
                Duration: {selectedService.duration} minutes • Price: ${selectedService.price}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Additional Notes <span className="text-gray-400">(Optional)</span>
          </Label>
          <textarea
            id="notes"
            rows={4}
            placeholder="Any specific requests, preferences, or information we should know..."
            className={`
              w-full px-3 py-2 border rounded-lg resize-none transition-all duration-200
              focus:outline-none focus:ring-2 bg-white text-black placeholder-gray-500
              ${errors.notes 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-gray-300 focus:border-black focus:ring-black/20'
              }
            `}
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-sm text-red-600 mt-1">
              {errors.notes.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Maximum 500 characters
          </p>
        </div>

        {/* Info Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircleIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">Walk-In Service</h4>
              <p className="text-xs text-amber-700">
                Please note that walk-in appointments are subject to availability. 
                We&apos;ll do our best to accommodate you as soon as possible.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting || loading}
          className="btn-primary w-full"
        >
          {isSubmitting || loading ? (
            <ButtonLoading text="Submitting..." />
          ) : (
            'Check In for Walk-In Service'
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