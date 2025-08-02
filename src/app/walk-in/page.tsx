'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlusIcon, ClockIcon, PhoneIcon, MailIcon } from 'lucide-react'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface WalkInFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  selectedService: string
  schedulingType: 'immediate' | 'scheduled'
  scheduledDate?: string
  scheduledTime?: string
  notes: string
}

const AVAILABLE_SERVICES = [
  { id: 'basic_facial', name: 'Basic Facial', duration: 30, price: 65, category: 'facial' },
  { id: 'deep_cleansing_facial', name: 'Deep Cleansing Facial', duration: 60, price: 79, category: 'facial' },
  { id: 'eyebrow_waxing', name: 'Eyebrow Waxing', duration: 15, price: 20, category: 'waxing' },
  { id: 'lip_waxing', name: 'Lip Waxing', duration: 5, price: 10, category: 'waxing' },
  { id: 'underarm_waxing', name: 'Underarm Waxing', duration: 15, price: 20, category: 'waxing' },
  { id: 'balinese_massage', name: 'Balinese Body Massage', duration: 60, price: 80, category: 'massage' },
  { id: 'deep_tissue_massage', name: 'Deep Tissue Body Massage', duration: 60, price: 90, category: 'massage' },
  { id: 'hot_stone_massage', name: 'Hot Stone Massage', duration: 60, price: 90, category: 'massage' },
]

export default function WalkInPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<WalkInFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    selectedService: '',
    schedulingType: 'immediate',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const selectedServiceData = AVAILABLE_SERVICES.find(s => s.id === formData.selectedService)

  const handleInputChange = (field: keyof WalkInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeStr)
      }
    }
    return slots
  }

  const validateForm = (): string | null => {
    if (!formData.customerName.trim()) return 'Customer name is required'
    if (!formData.customerPhone.trim()) return 'Customer phone is required'
    if (!formData.selectedService) return 'Please select a service'
    if (formData.schedulingType === 'scheduled') {
      if (!formData.scheduledDate) return 'Please select a date for scheduled appointment'
      if (!formData.scheduledTime) return 'Please select a time for scheduled appointment'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setSubmitMessage({ type: 'error', text: validationError })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      // Determine appointment date/time
      const appointmentDate = formData.schedulingType === 'immediate' 
        ? new Date().toISOString().split('T')[0]
        : formData.scheduledDate!
      
      const appointmentTime = formData.schedulingType === 'immediate'
        ? new Date().toTimeString().slice(0, 5)
        : formData.scheduledTime!

      // Generate a temporary booking ID
      const bookingId = `walkin_${Date.now()}`

      // Prepare customer and booking data
      const customerData = {
        name: formData.customerName,
        email: formData.customerEmail || '',
        phone: formData.customerPhone,
        isNewCustomer: true
      }

      const bookingData = {
        service: selectedServiceData!.name,
        serviceId: selectedServiceData!.id,
        serviceCategory: selectedServiceData!.category,
        ghlCategory: selectedServiceData!.category,
        date: appointmentDate,
        time: appointmentTime,
        duration: selectedServiceData!.duration,
        price: selectedServiceData!.price,
        staff: 'Any Available',
        room: 'TBD'
      }

      // Send walk-in webhook to GoHighLevel
      const webhookResult = await ghlWebhookSender.sendWalkInWebhook(
        bookingId,
        customerData,
        bookingData,
        formData.schedulingType === 'immediate'
      )

      if (webhookResult.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `Walk-in ${formData.schedulingType === 'immediate' ? 'check-in' : 'appointment'} registered successfully! Customer data sent to CRM.` 
        })
        
        // Reset form after success
        setTimeout(() => {
          setFormData({
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            selectedService: '',
            schedulingType: 'immediate',
            notes: ''
          })
          setSubmitMessage(null)
        }, 3000)
      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: `Registration successful but CRM sync failed: ${webhookResult.error}` 
        })
      }
    } catch (error) {
      console.error('Walk-in registration error:', error)
      setSubmitMessage({ 
        type: 'error', 
        text: 'Registration failed. Please try again or contact support.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-md mb-4">
            <UserPlusIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-primary">Walk-In Check-In</h1>
          </div>
          <p className="text-gray-600">
            Register walk-in customers for immediate service or scheduled appointments
          </p>
        </div>

        <Card className="p-8 shadow-xl border-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Customer Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer's full name"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone" className="text-sm font-medium">
                    Phone Number *
                  </Label>
                  <div className="relative mt-1">
                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-sm font-medium">
                  Email Address (Optional)
                </Label>
                <div className="relative mt-1">
                  <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="customer@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Service Selection
              </h2>
              
              <div>
                <Label htmlFor="selectedService" className="text-sm font-medium">
                  Select Service *
                </Label>
                <Select value={formData.selectedService} onValueChange={(value) => handleInputChange('selectedService', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_SERVICES.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{service.name}</span>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="outline" className="text-xs">
                              {service.duration}min
                            </Badge>
                            <span className="text-sm font-medium">${service.price}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedServiceData && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-blue-900">{selectedServiceData.name}</h3>
                      <p className="text-blue-700 text-sm">
                        Duration: {selectedServiceData.duration} minutes • Category: {selectedServiceData.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-900">${selectedServiceData.price}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduling Type */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Scheduling
              </h2>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('schedulingType', 'immediate')}
                  className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                    formData.schedulingType === 'immediate'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ClockIcon className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-medium">Immediate Service</div>
                  <div className="text-xs text-gray-600">Start treatment now</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('schedulingType', 'scheduled')}
                  className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                    formData.schedulingType === 'scheduled'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ClockIcon className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-medium">Schedule Later</div>
                  <div className="text-xs text-gray-600">Book for later today</div>
                </button>
              </div>

              {formData.schedulingType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledDate" className="text-sm font-medium">
                      Date *
                    </Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={formData.scheduledDate || ''}
                      onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                      required={formData.schedulingType === 'scheduled'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="scheduledTime" className="text-sm font-medium">
                      Time *
                    </Label>
                    <Select 
                      value={formData.scheduledTime || ''} 
                      onValueChange={(value) => handleInputChange('scheduledTime', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateTimeSlots().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special requests or notes about the customer..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Submit Message */}
            {submitMessage && (
              <Alert className={submitMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={submitMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {submitMessage.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </div>
                ) : (
                  `Register ${formData.schedulingType === 'immediate' ? 'Walk-In' : 'Appointment'}`
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}