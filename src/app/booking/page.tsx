'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import CouplesBooking from '@/components/CouplesBooking'
import BookingPageWrapper, { useBookingNavigation } from '@/components/booking/BookingPageWrapper'
import { analytics } from '@/lib/analytics'
import { saveBookingState } from '@/lib/booking-state-manager'

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState('')
  const [showCouplesOptions, setShowCouplesOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [animatedCategories, setAnimatedCategories] = useState(new Set())
  const [visibleCards, setVisibleCards] = useState(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const { navigateWithTransition, isNavigating } = useBookingNavigation()

  // Track page view and initialize loading
  useEffect(() => {
    analytics.pageViewed('service_selection', 1)
    // Simulate initial loading for smooth entrance
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
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

  // Intersection Observer for scroll-triggered animations
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target
            element.classList.add('animate')
            
            // Stagger card animations within categories
            if (element.classList.contains('category-container')) {
              const cards = element.querySelectorAll('.service-card-enhanced')
              cards.forEach((card, index) => {
                setTimeout(() => {
                  ;(card as HTMLElement).style.animationDelay = `${index * 100}ms`
                  card.classList.add('service-card-stagger')
                  setVisibleCards(prev => new Set(prev).add((card as HTMLElement).dataset.serviceId || ''))
                }, index * 100)
              })
            }
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    // Observe all category containers
    document.querySelectorAll('.category-container').forEach(el => {
      observerRef.current?.observe(el)
    })
  }, [])

  // Setup observers after loading
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setupIntersectionObserver()
      }, 100)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [isLoading, setupIntersectionObserver])

  // Animate category reveals
  const animateCategory = (categoryIndex: number) => {
    if (!animatedCategories.has(categoryIndex)) {
      setAnimatedCategories(prev => new Set(prev).add(categoryIndex))
    }
  }

  // Enhanced service selection with animation feedback
  const handleServiceSelect = (service: any, categoryName: string) => {
    setSelectedService(service.id)
    setShowCouplesOptions(true)
    
    // Add selection animation class and accessibility attributes
    const cardElement = document.querySelector(`[data-service-id="${service.id}"]`)
    if (cardElement) {
      cardElement.classList.add('service-card-selected-premium-enhanced')
      cardElement.setAttribute('aria-pressed', 'true')
      cardElement.setAttribute('aria-label', `${service.name} selected - $${service.price} for ${service.duration} minutes`)
    }
    
    // Remove selection from other cards
    document.querySelectorAll('.service-card-enhanced').forEach(el => {
      if (el !== cardElement) {
        el.classList.remove('service-card-selected-premium-enhanced')
        el.setAttribute('aria-pressed', 'false')
      }
    })
    
    // Track service selection
    analytics.serviceSelected(service.name, categoryName, service.price)
  }

  const serviceCategories = [
    {
      name: 'Facials',
      services: [
        { id: 'basic_facial', name: 'Basic Facial (For Men & Women)', duration: 30, price: 65 },
        { id: 'deep_cleansing_facial', name: 'Deep Cleansing Facial (for Men & Women)', duration: 60, price: 79 },
        { id: 'placenta_collagen_facial', name: 'Placenta | Collagen Facial', duration: 60, price: 90 },
        { id: 'whitening_kojic_facial', name: 'Whitening Kojic Facial', duration: 60, price: 90 },
        { id: 'anti_acne_facial', name: 'Anti-Acne Facial (for Men & Women)', duration: 60, price: 90 },
        { id: 'microderm_facial', name: 'Microderm Facial', duration: 60, price: 99 },
        { id: 'vitamin_c_facial', name: 'Vitamin C Facial with Extreme Softness', duration: 60, price: 120 },
        { id: 'acne_vulgaris_facial', name: 'Acne Vulgaris Facial', duration: 60, price: 120 },
      ]
    },
    {
      name: 'Body Massages',
      services: [
        { id: 'balinese_massage', name: 'Balinese Body Massage', duration: 60, price: 80 },
        { id: 'maternity_massage', name: 'Maternity Massage', duration: 60, price: 85 },
        { id: 'stretching_massage', name: 'Stretching Body Massage', duration: 60, price: 85 },
        { id: 'deep_tissue_massage', name: 'Deep Tissue Body Massage', duration: 60, price: 90 },
        { id: 'hot_stone_massage', name: 'Hot Stone Massage', duration: 60, price: 90 },
        { id: 'hot_stone_90', name: 'Hot Stone Massage 90 Minutes', duration: 90, price: 120 },
      ]
    },
    {
      name: 'Body Treatments',
      services: [
        { id: 'underarm_cleaning', name: 'Underarm Cleaning', duration: 30, price: 99 },
        { id: 'back_treatment', name: 'Back Treatment', duration: 30, price: 99 },
        { id: 'chemical_peel_body', name: 'Chemical Peel (Body) Per Area', duration: 30, price: 85 },
        { id: 'underarm_whitening', name: 'Underarm or Inguinal Whitening', duration: 30, price: 150 },
        { id: 'microdermabrasion_body', name: 'Microdermabrasion (Body) Per Area', duration: 30, price: 85 },
        { id: 'deep_moisturizing', name: 'Deep Moisturizing Body Treatment', duration: 30, price: 65 },
        { id: 'dead_sea_scrub', name: 'Dead Sea Salt Body Scrub', duration: 30, price: 65 },
        { id: 'dead_sea_scrub_moisturizing', name: 'Dead Sea Salt Body Scrub + Deep Moisturizing', duration: 30, price: 65 },
        { id: 'mud_mask_wrap', name: 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment', duration: 30, price: 65 },
      ]
    },
    {
      name: 'Waxing',
      services: [
        { id: 'eyebrow_waxing', name: 'Eyebrow Waxing', duration: 15, price: 20 },
        { id: 'lip_waxing', name: 'Lip Waxing', duration: 5, price: 10 },
        { id: 'half_arm_waxing', name: 'Half Arm Waxing', duration: 15, price: 40 },
        { id: 'full_arm_waxing', name: 'Full Arm Waxing', duration: 30, price: 60 },
        { id: 'chin_waxing', name: 'Chin Waxing', duration: 5, price: 12 },
        { id: 'neck_waxing', name: 'Neck Waxing', duration: 15, price: 30 },
        { id: 'lower_leg_waxing', name: 'Lower Leg Waxing', duration: 30, price: 40 },
        { id: 'full_leg_waxing', name: 'Full Leg Waxing', duration: 60, price: 80 },
        { id: 'full_face_waxing', name: 'Full Face Waxing', duration: 30, price: 60 },
        { id: 'bikini_waxing', name: 'Bikini Waxing', duration: 30, price: 35 },
        { id: 'underarm_waxing', name: 'Underarm Waxing', duration: 15, price: 20 },
        { id: 'brazilian_wax_women', name: 'Brazilian Wax ( Women )', duration: 45, price: 60 },
        { id: 'brazilian_wax_men', name: 'Brazilian Waxing ( Men)', duration: 45, price: 75 },
        { id: 'chest_wax', name: 'Chest Wax', duration: 30, price: 40 },
        { id: 'stomach_wax', name: 'Stomach Wax', duration: 30, price: 40 },
        { id: 'shoulders_wax', name: 'Shoulders', duration: 30, price: 30 },
        { id: 'feet_wax', name: 'Feet', duration: 5, price: 30 },
      ]
    },
    {
      name: 'Packages',
      services: [
        { id: 'balinese_facial_package', name: 'Balinese Body Massage + Basic Facial', duration: 90, price: 130 },
        { id: 'deep_tissue_3face', name: 'Deep Tissue Body Massage + 3Face', duration: 120, price: 180 },
        { id: 'hot_stone_microderm', name: 'Hot Stone Body Massage + Microderm Facial', duration: 150, price: 200 },
      ]
    },
    {
      name: 'Special Services',
      services: [
        { id: 'vajacial_brazilian', name: 'Basic Vajacial Cleaning + Brazilian Wax', duration: 30, price: 90 },
        { id: 'dermal_vip', name: 'Dermal VIP Card $50 / Year', duration: 30, price: 50 },
      ]
    }
  ]

  // Skeleton Loading Component
  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="p-6 space-y-4">
        <div className="skeleton-title"></div>
        <div className="flex justify-between items-center">
          <div className="skeleton-text w-20"></div>
          <div className="skeleton-text w-16"></div>
        </div>
        <div className="skeleton-text w-full h-12"></div>
      </div>
    </div>
  )

  // Enhanced Service Card Component
  const ServiceCard = ({ service, categoryName, index }: { service: any; categoryName: string; index: number }) => {
    const isSelected = selectedService === service.id
    const isVisible = visibleCards.has(service.id)
    
    return (
      <div
        key={service.id}
        data-service-id={service.id}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${service.name} - $${service.price} for ${service.duration} minutes`}
        className={`service-card-enhanced reveal-on-scroll ${
          isSelected ? 'service-card-selected-premium-enhanced' : 'service-card-premium-enhanced'
        }`}
        style={{
          animationDelay: `${index * 100}ms`
        }}
        onClick={() => handleServiceSelect(service, categoryName)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleServiceSelect(service, categoryName)
          }
        }}
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-4 leading-tight">
          {service.name}
        </h3>
        <div className="flex justify-between items-center mb-6">
          <span className="service-price text-3xl font-bold text-primary">
            ${service.price}
          </span>
          <span className="service-duration text-base text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {service.duration} mins
          </span>
        </div>
        <button
          className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
            isSelected
              ? 'bg-primary text-white shadow-lg'
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            handleServiceSelect(service, categoryName)
          }}
        >
          {isSelected ? 'Selected ✓' : 'Select Service'}
        </button>
      </div>
    )
  }

  return (
    <BookingPageWrapper 
      step={1} 
      title="Book Your Appointment"
      subtitle="Choose from our premium spa treatments and wellness services"
      showBackButton={false}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="text-center mb-12 animate-in slide-in-from-top-2" style={{ animationDelay: '200ms' }}>
          <div className="flex justify-center items-center space-x-6 mb-6">
            <Link 
              href="/" 
              className="btn-tertiary !w-auto px-6"
            >
              ← Back to Home
            </Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <a 
              href="https://dermalskinclinicspa.com/services" 
              className="btn-tertiary !w-auto px-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              🌐 Explore All Services
            </a>
          </div>
        </div>

          {/* Service Categories */}
          <div className="content-spacing">
            {isLoading ? (
              // Skeleton Loading State
              <>
                {[1, 2, 3].map((categoryIndex) => (
                  <div key={categoryIndex} className="card">
                    <div className="skeleton-title mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((cardIndex) => (
                        <SkeletonCard key={cardIndex} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Animated Service Categories
              serviceCategories.map((category, categoryIndex) => (
                <div 
                  key={category.name} 
                  className="category-container card reveal-on-scroll"
                  style={{ animationDelay: `${categoryIndex * 200}ms` }}
                  onAnimationEnd={() => animateCategory(categoryIndex)}
                >
                  <h2 className="text-3xl font-heading font-bold text-primary mb-8 animate-in slide-in-from-top-2" style={{ animationDelay: `${categoryIndex * 200 + 100}ms` }}>
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.services.map((service, serviceIndex) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        categoryName={category.name}
                        index={serviceIndex}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Couples Booking Component - Fixed Position Overlay */}
      {selectedService && showCouplesOptions && (
        <div className="modal-overlay animate-in fade-in-0 duration-300">
          <div className="modal-content animate-in slide-in-from-bottom-2 duration-300">
            <div className="modal-header">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-primary">
                Booking Options
              </h2>
              <button
                onClick={() => {
                  setShowCouplesOptions(false)
                  setSelectedService('')
                }}
                className="modal-close-btn"
                disabled={isNavigating}
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
                onContinue={async (bookingData) => {
                  if (isNavigating) return
                  
                  // Store booking data using state manager
                  saveBookingState({ bookingData })
                  
                  // Track couples booking selection
                  analytics.track('couples_booking_selected', {
                    primary_service: bookingData.primaryService.name,
                    secondary_service: bookingData.secondaryService?.name,
                    total_price: bookingData.totalPrice
                  })
                  
                  // Navigate to date/time selection with smooth transition
                  await navigateWithTransition('/booking/date-time', 'forward')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </BookingPageWrapper>
  )
} 