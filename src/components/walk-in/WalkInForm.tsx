'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FloatingInput } from '@/components/ui/floating-input'
import { FloatingTextarea } from '@/components/ui/floating-textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircleIcon } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading-spinner'

const walkInFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .refine((val) => /^\+?[\d\s\-\(\)]{10,15}$/.test(val), {
      message: 'Please enter a valid phone number'
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
    setValue
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
        <FloatingInput
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          isRequired={true}
          success={getFieldStatus('name') === 'success'}
          error={errors.name?.message}
          value={formData.name}
          {...register('name')}
        />

        {/* Phone Number */}
        <FloatingInput
          label="Phone Number"
          type="tel"
          placeholder="Enter your phone number"
          isRequired={true}
          success={getFieldStatus('phone') === 'success'}
          error={errors.phone?.message}
          value={formData.phone}
          {...register('phone')}
        />

        {/* Email */}
        <FloatingInput
          label="Email Address (Optional)"
          type="email"
          placeholder="Enter your email address"
          success={getFieldStatus('email') === 'success'}
          error={errors.email?.message}
          value={formData.email}
          {...register('email')}
        />

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
        <FloatingTextarea
          label="Additional Notes (Optional)"
          placeholder="Any specific requests, preferences, or information we should know..."
          rows={3}
          maxLength={500}
          error={errors.notes?.message}
          value={formData.notes}
          {...register('notes')}
        />

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