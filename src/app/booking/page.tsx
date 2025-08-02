'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BookingWithWaiver from '@/components/booking/BookingWithWaiver'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'
import ServiceCategoryCard from '@/components/booking/ServiceCategoryCard'
import { analytics } from '@/lib/analytics'

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState('')
  const [showCouplesOptions, setShowCouplesOptions] = useState(false)

  // Track page view
  useEffect(() => {
    analytics.pageViewed('service_selection', 1)
  }, [])

  const serviceCategories = [
    {
      name: 'BODY MASSAGES',
      description: 'Relaxing and therapeutic massage treatments',
      icon: '💆‍♀️',
      services: [
        { id: 'balinese_massage', name: 'Balinese Body Massage', duration: 60, price: 80, popular: false },
        { id: 'maternity_massage', name: 'Maternity Massage', duration: 60, price: 85, popular: false },
        { id: 'stretching_massage', name: 'Stretching Body Massage', duration: 60, price: 85, popular: false },
        { id: 'deep_tissue_massage', name: 'Deep Tissue Body Massage', duration: 60, price: 90, popular: true },
        { id: 'hot_stone_massage', name: 'Hot Stone Massage', duration: 60, price: 90, popular: true },
        { id: 'hot_stone_90', name: 'Hot Stone Massage 90 Minutes', duration: 90, price: 120, recommended: true },
      ]
    },
    {
      name: 'BODY TREATMENTS & BOOSTERS',
      description: 'Advanced body treatments and skin boosters',
      icon: '✨',
      services: [
        { id: 'underarm_cleaning', name: 'Underarm Cleaning', duration: 30, price: 99, popular: true },
        { id: 'back_treatment', name: 'Back Treatment', duration: 30, price: 99, popular: false },
        { id: 'chemical_peel_body', name: 'Chemical Peel (Body) Per Area', duration: 30, price: 85, popular: false },
        { id: 'underarm_whitening', name: 'Underarm or Inguinal Whitening', duration: 30, price: 150, recommended: true },
        { id: 'microdermabrasion_body', name: 'Microdermabrasion (Body) Per Area', duration: 30, price: 85, popular: false },
        { id: 'deep_moisturizing', name: 'Deep Moisturizing Body Treatment', duration: 30, price: 65, popular: false },
        { id: 'dead_sea_scrub', name: 'Dead Sea Salt Body Scrub', duration: 30, price: 65, popular: true },
        { id: 'dead_sea_scrub_moisturizing', name: 'Dead Sea Salt Body Scrub + Deep Moisturizing', duration: 30, price: 65, popular: false },
        { id: 'mud_mask_wrap', name: 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment', duration: 30, price: 65, popular: false },
      ]
    },
    {
      name: 'FACE TREATMENTS',
      description: 'Advanced facial treatments for all skin types',
      icon: '🧴',
      services: [
        { id: 'basic_facial', name: 'Basic Facial (For Men & Women)', duration: 30, price: 65, popular: true },
        { id: 'deep_cleansing_facial', name: 'Deep Cleansing Facial (for Men & Women)', duration: 60, price: 79, popular: true },
        { id: 'placenta_collagen_facial', name: 'Placenta | Collagen Facial', duration: 60, price: 90, popular: false },
        { id: 'whitening_kojic_facial', name: 'Whitening Kojic Facial', duration: 60, price: 90, popular: false },
        { id: 'anti_acne_facial', name: 'Anti-Acne Facial (for Men & Women)', duration: 60, price: 90, popular: true },
        { id: 'microderm_facial', name: 'Microderm Facial', duration: 60, price: 99, recommended: true },
        { id: 'vitamin_c_facial', name: 'Vitamin C Facial with Extreme Softness', duration: 60, price: 120, recommended: true },
        { id: 'acne_vulgaris_facial', name: 'Acne Vulgaris Facial', duration: 60, price: 120, popular: false },
      ]
    },
    {
      name: 'FACE & BODY PACKAGES',
      description: 'Complete spa experiences combining multiple treatments',
      icon: '🎁',
      services: [
        { id: 'balinese_facial_package', name: 'Balinese Body Massage + Basic Facial', duration: 90, price: 130, popular: true },
        { id: 'deep_tissue_3face', name: 'Deep Tissue Body Massage + 3Face', duration: 120, price: 180, recommended: true },
        { id: 'hot_stone_microderm', name: 'Hot Stone Body Massage + Microderm Facial', duration: 150, price: 200, recommended: true },
        { id: 'vajacial_brazilian', name: 'Basic Vajacial Cleaning + Brazilian Wax', duration: 30, price: 90, popular: false },
        { id: 'dermal_vip', name: 'Dermal VIP Card $50 / Year', duration: 30, price: 50, popular: false },
      ]
    },
    {
      name: 'WAXING SERVICES',
      description: 'Professional hair removal services',
      icon: '✂️',
      services: [
        { id: 'eyebrow_waxing', name: 'Eyebrow Waxing', duration: 15, price: 20, popular: true },
        { id: 'lip_waxing', name: 'Lip Waxing', duration: 5, price: 10, popular: true },
        { id: 'half_arm_waxing', name: 'Half Arm Waxing', duration: 15, price: 40, popular: false },
        { id: 'full_arm_waxing', name: 'Full Arm Waxing', duration: 30, price: 60, popular: false },
        { id: 'chin_waxing', name: 'Chin Waxing', duration: 5, price: 12, popular: false },
        { id: 'neck_waxing', name: 'Neck Waxing', duration: 15, price: 30, popular: false },
        { id: 'lower_leg_waxing', name: 'Lower Leg Waxing', duration: 30, price: 40, popular: true },
        { id: 'full_leg_waxing', name: 'Full Leg Waxing', duration: 60, price: 80, recommended: true },
        { id: 'full_face_waxing', name: 'Full Face Waxing', duration: 30, price: 60, popular: false },
        { id: 'bikini_waxing', name: 'Bikini Waxing', duration: 30, price: 35, popular: true },
        { id: 'underarm_waxing', name: 'Underarm Waxing', duration: 15, price: 20, popular: true },
        { id: 'brazilian_wax_women', name: 'Brazilian Wax ( Women )', duration: 45, price: 60, recommended: true },
        { id: 'brazilian_wax_men', name: 'Brazilian Waxing ( Men)', duration: 45, price: 75, recommended: true },
        { id: 'chest_wax', name: 'Chest Wax', duration: 30, price: 40, popular: false },
        { id: 'stomach_wax', name: 'Stomach Wax', duration: 30, price: 40, popular: false },
        { id: 'shoulders_wax', name: 'Shoulders', duration: 30, price: 30, popular: false },
        { id: 'feet_wax', name: 'Feet', duration: 5, price: 30, popular: false },
      ]
    }
  ]

  const handleServiceSelect = (serviceId: string, service: any) => {
    setSelectedService(serviceId)
    setShowCouplesOptions(true)
  }

  const handleAnalyticsTrack = (serviceName: string, categoryName: string, price: number) => {
    analytics.serviceSelected(serviceName, categoryName, price)
  }

  return (
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
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
            <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
              Book Your Appointment
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our premium spa treatments and wellness services
            </p>
          </div>

          {/* Service Categories */}
          <div className="space-y-6">
            {serviceCategories.map((category) => (
              <ServiceCategoryCard
                key={category.name}
                category={category}
                selectedService={selectedService}
                onServiceSelect={handleServiceSelect}
                onAnalyticsTrack={handleAnalyticsTrack}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Couples Booking Component - Fixed Position Overlay */}
      {selectedService && showCouplesOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-0 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-heading font-bold text-primary">
                Booking Options
              </h2>
              <button
                onClick={() => {
                  setShowCouplesOptions(false)
                  setSelectedService('')
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-8">
              <BookingWithWaiver
                selectedService={
                  serviceCategories
                    .flatMap(cat => cat.services)
                    .find(s => s.id === selectedService) || null
                }
                serviceCategories={serviceCategories}
                onContinue={(bookingData, waiverData) => {
                  // Store booking data and waiver data in localStorage
                  const dataToStore = {
                    bookingData,
                    waiverData: waiverData || null
                  }
                  localStorage.setItem('bookingData', JSON.stringify(dataToStore))
                  // Navigate to date/time selection
                  window.location.href = '/booking/date-time'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
} 