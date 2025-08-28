'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CouplesBooking from '@/components/CouplesBooking'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import { analytics } from '@/lib/analytics'
import { saveBookingState } from '@/lib/booking-state-manager'
import { trackBookingAbandonment } from '@/lib/booking-utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { InlineLoading } from '@/components/ui/loading-spinner'

interface Service {
  id: string
  name: string
  duration: number
  price: number
  category?: string
  description?: string
  allows_addons?: boolean
  is_consultation?: boolean
}

interface ServiceCategory {
  name: string
  category: string
  services: Service[]
}

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState('')
  const [showCouplesOptions, setShowCouplesOptions] = useState(false)
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track page view
  useEffect(() => {
    analytics.pageViewed('service_selection', 1)
  }, [])

  // Fetch services from database
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch('/api/services/grouped')
        if (!response.ok) {
          throw new Error('Failed to fetch services')
        }
        const data = await response.json()
        setServiceCategories(data)
      } catch (err) {
        console.error('Error fetching services:', err)
        setError('Failed to load services. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  // Start tracking abandonment when user visits booking page
  useEffect(() => {
    const cleanup = trackBookingAbandonment()
    return cleanup
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showCouplesOptions) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCouplesOptions])

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    
    // Find the selected service details
    let selectedServiceData = null
    for (const category of serviceCategories) {
      const service = category.services.find(s => s.id === serviceId)
      if (service) {
        selectedServiceData = {
          ...service,
          category: category.category
        }
        break
      }
    }
    
    if (selectedServiceData) {
      // Save to session storage for next page
      sessionStorage.setItem('selectedService', JSON.stringify(selectedServiceData))
      
      // Save to booking state
      saveBookingState({
        currentStep: 2,
        selectedService: selectedServiceData
      })
      
      // Track service selection
      analytics.serviceSelected(
        selectedServiceData.name, 
        selectedServiceData.category || '', 
        selectedServiceData.price
      )
      
      // Track consultation booking if applicable
      if (selectedServiceData.is_consultation) {
        analytics.track('consultation_booked', {
          service_name: selectedServiceData.name,
          price: selectedServiceData.price,
          duration: selectedServiceData.duration
        })
      }
      
      // Navigate to add-ons if service allows them (but skip for consultations), otherwise go to date selection
      if (selectedServiceData.allows_addons && !selectedServiceData.is_consultation) {
        window.location.href = '/booking/addons'
      } else {
        window.location.href = '/booking/date-time'
      }
    }
  }

  const handlePackageSelect = (serviceId: string) => {
    // Find the selected service
    let selectedServiceData = null
    for (const category of serviceCategories) {
      const service = category.services.find(s => s.id === serviceId)
      if (service) {
        selectedServiceData = {
          ...service,
          category: category.category
        }
        break
      }
    }
    
    if (selectedServiceData) {
      // Check if it's a couples service or can be booked as couples
      setSelectedService(serviceId)
      sessionStorage.setItem('tempSelectedService', JSON.stringify(selectedServiceData))
      setShowCouplesOptions(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <InlineLoading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background dark:bg-gray-900 section-spacing">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-between items-center mb-6">
              <Link 
                href="/" 
                className="btn-tertiary !w-auto px-6 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                ← Back to Home
              </Link>
              <ThemeToggle />
              <a 
                href="https://dermalskinclinicspa.com/services" 
                className="btn-tertiary !w-auto px-6 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                🌐 Explore All Services
              </a>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading text-primary dark:text-primary-light mb-4">
              Book Your Appointment
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from our premium spa treatments and wellness services
            </p>
          </div>

          {/* Service Categories */}
          <div className="space-y-12">
            {serviceCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-heading text-primary dark:text-primary-light mb-6">
                  {category.name}
                  <span className="text-sm ml-3 text-gray-500 dark:text-gray-400">
                    ({category.services.length} services)
                  </span>
                </h2>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.services.map((service) => {
                    // Check if this is a consultation service
                    const isConsultation = service.is_consultation || service.name.toLowerCase().includes('consultation');
                    
                    return (
                    <div
                      key={service.id}
                      className={
                        isConsultation
                          ? "relative border-2 border-primary/30 dark:border-primary-light/40 rounded-xl p-6 bg-gradient-to-br from-accent/20 via-white to-accent/10 dark:from-primary/10 dark:via-gray-800 dark:to-primary-light/5 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary-light/20 transition-all duration-500 cursor-pointer group overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02]"
                          : "border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary dark:hover:border-primary-light transition-all cursor-pointer group"
                      }
                      onClick={() => {
                        // Consultations should never show couples modal
                        if (isConsultation) {
                          handleServiceSelect(service.id)
                          return
                        }
                        
                        // Show couples modal for packages, ALL facials (except consultations), massages 60min+, and services with "couple" in name
                        const isCouplesEligible = 
                          category.category === 'packages' || 
                          (category.category === 'facials' && !isConsultation) ||  // ALL facials except consultations
                          service.name.toLowerCase().includes('couple') ||
                          (category.category === 'massages' && service.duration >= 60)
                        
                        console.log('Service clicked:', service.name, {
                          category: category.category,
                          duration: service.duration,
                          isCouplesEligible,
                          isConsultation
                        })
                        
                        if (isCouplesEligible) {
                          handlePackageSelect(service.id)
                        } else {
                          handleServiceSelect(service.id)
                        }
                      }}
                    >
                      {/* Consultation premium ribbon/badge */}
                      {isConsultation && (
                        <div className="absolute top-0 right-0">
                          {/* Ribbon effect */}
                          <div className="relative">
                            <div className="bg-gradient-to-r from-primary to-primary-dark text-white text-xs px-4 py-2 rounded-bl-xl rounded-tr-xl font-semibold shadow-lg flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              Expert Consultation
                            </div>
                            {/* Small triangle shadow effect */}
                            <div className="absolute -bottom-1 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary-dark/50"></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Subtle background pattern for consultations */}
                      {isConsultation && (
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]">
                          <div className="w-full h-full" style={{
                            backgroundImage: `radial-gradient(circle at 20px 20px, var(--primary) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px'
                          }}></div>
                        </div>
                      )}
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className={`font-semibold transition-colors flex-1 pr-2 ${
                            isConsultation 
                              ? "text-primary-dark dark:text-primary-light group-hover:text-primary dark:group-hover:text-primary text-lg font-heading"
                              : "text-gray-800 dark:text-gray-200 group-hover:text-primary dark:group-hover:text-primary-light"
                          }`}>
                            {service.name}
                            {service.allows_addons && !isConsultation && (
                              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                Add-ons Available
                              </span>
                            )}
                          </h3>
                          <span className={`font-bold whitespace-nowrap text-xl ${
                            isConsultation
                              ? "text-primary-dark dark:text-primary-light bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-lg shadow-sm"
                              : "text-primary dark:text-primary-light"
                          }`}>
                            ${service.price}
                          </span>
                        </div>
                        
                        {service.description && (
                          <p className={`text-sm mb-4 leading-relaxed ${
                            isConsultation
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}>
                            {service.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 ${isConsultation ? "text-primary" : "text-gray-500 dark:text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className={`text-sm font-medium ${
                            isConsultation 
                              ? "text-primary-dark dark:text-primary-light"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {service.duration} minutes
                          </p>
                        </div>
                        
                        {/* Simplified consultation indicator */}
                        {isConsultation && (
                          <div className="mt-3 pt-3 border-t border-primary/20 dark:border-primary-light/20">
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent/40 dark:bg-primary/20 text-primary-dark dark:text-primary-light">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Get Expert Advice
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {serviceCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No services available at this time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Couples Booking Modal */}
      {showCouplesOptions && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-2xl font-heading text-primary">Couples Booking Options</h2>
              <button
                onClick={() => {
                  setShowCouplesOptions(false)
                  setSelectedService('')
                }}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <CouplesBooking
                selectedService={
                  serviceCategories
                    .flatMap(cat => cat.services)
                    .find(s => s.id === selectedService) || null
                }
                serviceCategories={serviceCategories}
                onContinue={(bookingData) => {
                  // Store booking data using state manager
                  saveBookingState({ 
                    bookingData,
                    currentStep: 2
                  })
                  
                  // Store in session storage
                  sessionStorage.setItem('bookingData', JSON.stringify(bookingData))
                  
                  // Track couples booking
                  if (bookingData.isCouplesBooking) {
                    analytics.couplesBookingStarted(
                      bookingData.primaryService.name,
                      bookingData.secondaryService?.name || bookingData.primaryService.name,
                      bookingData.totalPrice
                    )
                  }
                  
                  // Navigate to add-ons if primary service allows them, otherwise go to date selection
                  if (bookingData.primaryService?.allows_addons) {
                    // For couples booking, we need to save the primary service for add-ons
                    saveBookingState({ 
                      selectedService: bookingData.primaryService,
                      currentStep: 2
                    })
                    window.location.href = '/booking/addons'
                  } else {
                    window.location.href = '/booking/date-time'
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}