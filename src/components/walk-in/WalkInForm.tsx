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
import { Switch } from '@/components/ui/switch'
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading-spinner'
import { validatePhoneNumber, normalizePhoneForDB } from '@/lib/phone-utils'

const walkInFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .transform((val) => normalizePhoneForDB(val))
    .refine((val) => validatePhoneNumber(val), {
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
    .optional(),
  marketingConsent: z.boolean().default(false),
  // Couples booking fields
  isCouplesBooking: z.boolean().default(false),
  secondPersonName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  secondPersonPhone: z.string()
    .transform((val) => val ? normalizePhoneForDB(val) : '')
    .refine((val) => !val || validatePhoneNumber(val), {
      message: 'Please enter a valid phone number'
    })
    .optional(),
  secondService: z.string().optional()
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
  const [isCouplesBooking, setIsCouplesBooking] = useState(false)
  const [secondSelectedService, setSecondSelectedService] = useState<Service | null>(null)

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
      notes: '',
      marketingConsent: false,
      isCouplesBooking: false,
      secondPersonName: '',
      secondPersonPhone: '',
      secondService: ''
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
      // Reset couples booking if service changes
      if (service && !isCouplesCompatible(service)) {
        setIsCouplesBooking(false)
        setValue('isCouplesBooking', false)
      }
    }
  }, [formData.service, services, setValue])

  // Update second selected service when it changes
  useEffect(() => {
    if (formData.secondService) {
      const service = services.find(s => s.id === formData.secondService)
      setSecondSelectedService(service || null)
    }
  }, [formData.secondService, services])

  // Check if a service is couples-compatible
  const isCouplesCompatible = (service: Service) => {
    // All services are couples-compatible according to business requirements
    // Database categories: facial, massage, body_treatment, body_scrub, waxing, package, membership
    return true
  }

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
      // Add couples booking flag and validate second person data if needed
      const submissionData = {
        ...data,
        isCouplesBooking,
        secondPersonName: isCouplesBooking ? data.secondPersonName : undefined,
        secondPersonPhone: isCouplesBooking ? data.secondPersonPhone : undefined,
        secondService: isCouplesBooking ? data.secondService : undefined
      }
      await onSubmit(submissionData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = isValid && formData.name && formData.phone && formData.service &&
    (!isCouplesBooking || (formData.secondPersonName && formData.secondService))

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

        {/* Couples Booking Toggle - Only show for compatible services */}
        {selectedService && isCouplesCompatible(selectedService) && (
          <div className="space-y-2">
            <div 
              className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isCouplesBooking 
                  ? 'border-[#C36678] bg-[#C36678]/10 shadow-md' 
                  : 'border-gray-300 bg-white hover:border-[#C36678]/70 hover:bg-[#C36678]/5 hover:shadow-sm'
              }`}
              onClick={() => {
                setIsCouplesBooking(!isCouplesBooking)
                setValue('isCouplesBooking', !isCouplesBooking)
              }}
            >
              <div className="cursor-pointer flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-medium text-gray-900">Book as a couple</span>
                  {!isCouplesBooking && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#C36678]/10 text-[#C36678] border border-[#C36678]/20">
                      Available
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Enjoy your spa experience together
                </p>
              </div>
              <Switch
                id="couples-toggle"
                checked={isCouplesBooking}
                onCheckedChange={(checked) => {
                  setIsCouplesBooking(checked)
                  setValue('isCouplesBooking', checked)
                }}
                className="data-[state=checked]:bg-[#C36678]"
              />
            </div>
          </div>
        )}

        {/* Second Person Fields - Show when couples booking is enabled */}
        {isCouplesBooking && (
          <div className="space-y-6 animate-in slide-in-from-top-2 duration-300 border-l-4 border-[#C36678]/30 pl-4">
            <div className="text-base font-medium text-[#C36678] mb-4">
              Second Person Information
            </div>

            {/* Second Person Name */}
            <div className="space-y-2">
              <Label htmlFor="secondPersonName" className="text-sm font-medium text-gray-700">
                Second Person&apos;s Name *
              </Label>
              <div className="relative">
                <Input
                  id="secondPersonName"
                  type="text"
                  placeholder="Enter second person's name"
                  className={getInputClasses('secondPersonName')}
                  {...register('secondPersonName')}
                />
                {getFieldStatus('secondPersonName') === 'success' && (
                  <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-success" />
                )}
                {getFieldStatus('secondPersonName') === 'error' && (
                  <AlertCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-error" />
                )}
              </div>
              {errors.secondPersonName && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircleIcon className="w-4 h-4" />
                  {errors.secondPersonName.message}
                </p>
              )}
            </div>

            {/* Second Person Phone */}
            <div className="space-y-2">
              <Label htmlFor="secondPersonPhone" className="text-sm font-medium text-gray-700">
                Second Person&apos;s Phone <span className="text-gray-400">(Optional)</span>
              </Label>
              <PhoneInput
                id="secondPersonPhone"
                value={watch('secondPersonPhone') || ''}
                onChange={(rawValue, formatted, isValid) => {
                  setValue('secondPersonPhone', rawValue, { 
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true 
                  })
                }}
                onBlur={() => trigger('secondPersonPhone')}
                error={!!errors.secondPersonPhone}
                showError={true}
                errorMessage={errors.secondPersonPhone?.message}
                returnRawValue={true}
                className={getInputClasses('secondPersonPhone')}
              />
            </div>

            {/* Second Person Service */}
            <div className="space-y-2">
              <Label htmlFor="secondService" className="text-sm font-medium text-gray-700">
                Service for Second Person *
              </Label>
              {loadingServices ? (
                <div className="h-10 bg-gray-100 animate-pulse rounded-md"></div>
              ) : (
                <Select onValueChange={(value) => setValue('secondService', value)} value={formData.secondService}>
                  <SelectTrigger className={getInputClasses('secondService')}>
                    <SelectValue placeholder="Select a service for second person" />
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
              {errors.secondService && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircleIcon className="w-4 h-4" />
                  {errors.secondService.message}
                </p>
              )}
              {secondSelectedService && (
                <div className="bg-[#C36678]/10 p-3 rounded-lg text-sm">
                  <div className="font-medium text-[#C36678]">{secondSelectedService.name}</div>
                  <div className="text-gray-700">
                    Duration: {secondSelectedService.duration} minutes • Price: ${secondSelectedService.price}
                  </div>
                </div>
              )}
            </div>

            {/* Total Price Display for Couples */}
            <div className="bg-gradient-to-r from-[#C36678]/10 to-pink-50 p-4 rounded-lg border border-[#C36678]/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total for Both Services:</span>
                <span className="text-xl font-bold text-[#C36678]">
                  ${(selectedService?.price || 0) + (secondSelectedService?.price || 0)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Services will be provided simultaneously in a couples-capable room
              </p>
            </div>
          </div>
        )}

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

        {/* Marketing Consent */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="marketingConsent"
            checked={formData.marketingConsent}
            onChange={(e) => setValue('marketingConsent', e.target.checked)}
            className="mt-1 h-4 w-4 text-primary-dark focus:ring-primary-dark border-gray-300 rounded"
          />
          <div className="flex-1">
            <label htmlFor="marketingConsent" className="text-sm font-medium text-gray-700">
              Marketing Communications
            </label>
            <p className="text-xs text-gray-500 mt-1">
              I would like to receive promotional offers, special discounts, and updates about new services via email. 
              You can unsubscribe at any time.
            </p>
          </div>
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