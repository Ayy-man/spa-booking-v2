'use client'

import { useState } from 'react'
import Link from 'next/link'
import CouplesBooking from '@/components/CouplesBooking'

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState('')
  const [showCouplesOptions, setShowCouplesOptions] = useState(false)

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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
              ← Back to Home
            </Link>
            <span className="text-gray-300">|</span>
            <a 
              href="https://dermalskinclinicspa.com/services" 
              className="text-primary hover:text-primary-dark transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              🌐 Explore All Services
            </a>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Book Your Appointment
          </h1>
          <p className="text-gray-600">
            Select a service to begin
          </p>
        </div>

        {/* Service Categories */}
        <div className="space-y-8">
          {serviceCategories.map((category) => (
            <div key={category.name} className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-heading text-primary-dark mb-6">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.services.map((service) => (
                  <div
                    key={service.id}
                    className={`card cursor-pointer transition-all ${
                      selectedService === service.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedService(service.id)
                      setShowCouplesOptions(true)
                    }}
                  >
                    <h3 className="text-lg font-medium text-primary-dark mb-2">
                      {service.name}
                    </h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl font-semibold text-primary">
                        ${service.price}
                      </span>
                      <span className="text-sm text-gray-500">
                        {service.duration} mins
                      </span>
                    </div>
                    <button
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        selectedService === service.id
                          ? 'bg-primary text-white'
                          : 'bg-black text-white hover:bg-gray-900'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedService(service.id)
                        setShowCouplesOptions(true)
                      }}
                    >
                      {selectedService === service.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Couples Booking Component - Fixed Position Overlay */}
        {selectedService && showCouplesOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-heading text-primary-dark">
                  Booking Options
                </h2>
                <button
                  onClick={() => {
                    setShowCouplesOptions(false)
                    setSelectedService('')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <CouplesBooking
                  selectedService={
                    serviceCategories
                      .flatMap(cat => cat.services)
                      .find(s => s.id === selectedService) || null
                  }
                  serviceCategories={serviceCategories}
                  onContinue={(bookingData) => {
                    // Store booking data in localStorage
                    localStorage.setItem('bookingData', JSON.stringify(bookingData))
                    // Navigate to date/time selection
                    window.location.href = '/booking/date-time'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 