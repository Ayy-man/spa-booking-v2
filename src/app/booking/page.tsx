'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState('')

  const serviceCategories = [
    {
      name: 'Facials',
      services: [
        { id: 'basic_facial', name: 'Basic Facial', duration: 30, price: 65 },
        { id: 'deep_cleansing_facial', name: 'Deep Cleansing Facial', duration: 60, price: 79 },
        { id: 'placenta_collagen_facial', name: 'Placenta/Collagen Facial', duration: 60, price: 90 },
        { id: 'whitening_kojic_facial', name: 'Whitening Kojic Facial', duration: 60, price: 90 },
        { id: 'anti_acne_facial', name: 'Anti-Acne Facial', duration: 60, price: 90 },
        { id: 'microderm_facial', name: 'Microderm Facial', duration: 60, price: 99 },
        { id: 'vitamin_c_facial', name: 'Vitamin C Facial', duration: 60, price: 120 },
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
        { id: 'chemical_peel_body', name: 'Chemical Peel (Body)', duration: 30, price: 85 },
        { id: 'underarm_whitening', name: 'Underarm/Inguinal Whitening', duration: 30, price: 150 },
        { id: 'microdermabrasion_body', name: 'Microdermabrasion (Body)', duration: 30, price: 85 },
        { id: 'deep_moisturizing', name: 'Deep Moisturizing Body Treatment', duration: 30, price: 65 },
        { id: 'dead_sea_scrub', name: 'Dead Sea Salt Body Scrub', duration: 30, price: 65 },
        { id: 'mud_mask_wrap', name: 'Mud Mask Body Wrap', duration: 30, price: 65 },
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
        { id: 'brazilian_wax_women', name: 'Brazilian Wax (Women)', duration: 45, price: 60 },
        { id: 'brazilian_wax_men', name: 'Brazilian Waxing (Men)', duration: 45, price: 75 },
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
        { id: 'dermal_vip', name: 'Dermal VIP Card', duration: 30, price: 50 },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Demo Warning */}
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 mx-auto max-w-4xl">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium">
                🚧 PROTOTYPE BOOKING SYSTEM - DEMO ONLY
              </p>
              <p className="text-sm">
                This is a demonstration of the booking system. No real appointments will be scheduled.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Book Your Demo Appointment
          </h1>
          <p className="text-gray-600">
            Select a service to test the booking flow
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
                    onClick={() => setSelectedService(service.id)}
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
                    >
                      {selectedService === service.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        {selectedService && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="container mx-auto">
              <button 
                onClick={() => {
                  // Find the selected service object
                  const service = serviceCategories
                    .flatMap(cat => cat.services)
                    .find(s => s.id === selectedService)
                  
                  if (service) {
                    // Store in localStorage
                    localStorage.setItem('selectedService', JSON.stringify(service))
                    // Navigate to date/time selection
                    window.location.href = '/booking/date-time'
                  }
                }}
                className="btn-continue"
              >
                Continue to Date & Time Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 