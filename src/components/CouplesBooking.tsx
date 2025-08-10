'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { analytics } from '@/lib/analytics'

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface CouplesBookingProps {
  selectedService: Service | null
  serviceCategories: Array<{
    name: string
    services: Service[]
  }>
  onContinue: (bookingData: BookingData) => void
}

interface BookingData {
  isCouplesBooking: boolean
  primaryService: Service
  secondaryService?: Service
  totalPrice: number
  totalDuration: number
}

export default function CouplesBooking({ selectedService, serviceCategories, onContinue }: CouplesBookingProps) {
  // Start with false - user must explicitly opt-in to couples booking
  const [isCouplesBooking, setIsCouplesBooking] = useState(false)
  const [sameService, setSameService] = useState(true)
  const [secondaryService, setSecondaryService] = useState<Service | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')

  // Log initialization
  useEffect(() => {
    console.log('[CouplesBooking] Component initialized:', {
      serviceName: selectedService?.name,
      initialIsCouplesBooking: isCouplesBooking,
      localStorage: {
        bookingData: localStorage.getItem('bookingData'),
        selectedService: localStorage.getItem('selectedService')
      }
    })
  }, [])

  // Reset secondary service when couples booking is toggled off
  useEffect(() => {
    if (!isCouplesBooking) {
      setSecondaryService(null)
      setSameService(true)
    }
  }, [isCouplesBooking])

  // Auto-select same service when toggled to same service
  useEffect(() => {
    if (sameService && isCouplesBooking && selectedService) {
      setSecondaryService(selectedService)
    }
  }, [sameService, isCouplesBooking, selectedService])

  if (!selectedService) return null

  const totalPrice = isCouplesBooking && secondaryService 
    ? selectedService.price + secondaryService.price 
    : selectedService.price

  const totalDuration = isCouplesBooking && secondaryService
    ? Math.max(selectedService.duration, secondaryService.duration)
    : selectedService.duration

  const handleContinue = () => {
    const bookingData: BookingData = {
      isCouplesBooking,
      primaryService: selectedService,
      secondaryService: isCouplesBooking ? secondaryService || undefined : undefined,
      totalPrice,
      totalDuration
    }
    
    console.log('[CouplesBooking] Continue clicked with:', {
      isCouplesBooking,
      serviceName: selectedService.name,
      secondaryService: secondaryService?.name,
      totalPrice,
      totalDuration
    })
    
    // Track couples booking if enabled
    if (isCouplesBooking && secondaryService) {
      analytics.couplesBookingStarted(
        selectedService.name,
        secondaryService.name,
        totalPrice
      )
    }
    
    onContinue(bookingData)
  }

  return (
    <div>
      {/* No header needed - it's in the modal */}

      {/* Selected Service Display */}
      <div className="mb-6 p-4 bg-accent/10 rounded-lg">
        <h3 className="font-medium text-primary-dark mb-2">Selected Service</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{selectedService.name}</span>
          <div className="text-right">
            <span className="text-xl font-semibold text-primary">${selectedService.price}</span>
            <span className="text-sm text-gray-500 ml-2">{selectedService.duration} mins</span>
          </div>
        </div>
      </div>

      {/* Booking Type Selection - Default to Single */}
      <div className="mb-6">
        <h3 className="font-medium text-primary-dark mb-3">Booking Type</h3>
        
        {/* Single Booking Option - Default Selected */}
        <div className={`mb-3 flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer ${
          !isCouplesBooking 
            ? 'border-primary bg-primary/10 shadow-md' 
            : 'border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50'
        }`}
        onClick={() => {
          console.log('[CouplesBooking] Single booking selected')
          setIsCouplesBooking(false)
        }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-medium text-primary-dark">Single Booking</span>
              {!isCouplesBooking && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Selected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Book this service for yourself
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 ${
            !isCouplesBooking ? 'bg-primary border-primary' : 'border-gray-400'
          }`}>
            {!isCouplesBooking && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Couples Booking Option */}
        <div className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isCouplesBooking 
            ? 'border-primary bg-primary/10 shadow-md' 
            : 'border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50'
        }`}
        onClick={() => {
          console.log('[CouplesBooking] Couples booking selected')
          setIsCouplesBooking(true)
        }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-medium text-primary-dark">Couples Booking</span>
              {isCouplesBooking && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Selected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Enjoy your spa experience together with a partner
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 ${
            isCouplesBooking ? 'bg-primary border-primary' : 'border-gray-400'
          }`}>
            {isCouplesBooking && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Couples Options */}
      {isCouplesBooking && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* Same/Different Service Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium text-primary-dark">
              Service Selection for Second Person
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setSameService(true)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  sameService 
                    ? 'border-primary bg-accent/20 text-primary-dark' 
                    : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Same Service</span>
                <p className="text-sm text-gray-600 mt-1">
                  Both enjoy {selectedService.name}
                </p>
              </button>
              <button
                onClick={() => setSameService(false)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  !sameService 
                    ? 'border-primary bg-accent/20 text-primary-dark' 
                    : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Different Service</span>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a different treatment
                </p>
              </button>
            </div>
          </div>

          {/* Different Service Selection */}
          {!sameService && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-base font-medium text-primary-dark">
                Select Service for Second Person
              </Label>
              
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full input-field"
              >
                <option value="">All Categories</option>
                {serviceCategories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Service Grid */}
              <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {serviceCategories
                  .filter(cat => !selectedCategory || cat.name === selectedCategory)
                  .map((category) => (
                    <div key={category.name}>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        {category.name}
                      </h4>
                      <div className="space-y-2">
                        {category.services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => setSecondaryService(service)}
                            className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all text-left min-h-[56px] ${
                              secondaryService?.id === service.id
                                ? 'border-primary bg-accent/20'
                                : 'border-gray-200 hover:border-primary/50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {service.name}
                              </span>
                              <div className="text-right">
                                <span className="font-semibold text-primary">
                                  ${service.price}
                                </span>
                                <span className="text-xs text-gray-500 ml-1">
                                  {service.duration}min
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Second Person Service Summary */}
          {secondaryService && (
            <div className="p-4 bg-accent/10 rounded-lg animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-medium text-primary-dark mb-2">Second Person Service</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{secondaryService.name}</span>
                <div className="text-right">
                  <span className="text-xl font-semibold text-primary">${secondaryService.price}</span>
                  <span className="text-sm text-gray-500 ml-2">{secondaryService.duration} mins</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Summary */}
      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium text-primary-dark">Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">${totalPrice}</span>
            <span className="text-sm text-gray-500 ml-2">
              {totalDuration} mins
              {isCouplesBooking && ' (concurrent)'}
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={isCouplesBooking && !secondaryService}
          className="btn-continue-premium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Date & Time Selection
        </button>
      </div>
    </div>
  )
}