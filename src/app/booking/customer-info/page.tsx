'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CustomerInfoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
    isNewCustomer: false
  })
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('')

  useEffect(() => {
    // Get data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')
    const staffData = localStorage.getItem('selectedStaff')

    if (serviceData) setSelectedService(JSON.parse(serviceData))
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    if (staffData) setSelectedStaff(staffData)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Store customer info
    localStorage.setItem('customerInfo', JSON.stringify(formData))
    
    // Check customer status and redirect accordingly
    if (formData.isNewCustomer) {
      // New customer - redirect to GoHighLevel payment link
      const ghlPaymentUrl = 'https://link.fastpaydirect.com/payment-link/6888ac57ddc6a6108ec5a034'
      window.location.href = ghlPaymentUrl
    } else {
      // Existing customer - go directly to confirmation
      window.location.href = '/booking/confirmation'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const staffMembers = {
    'any': 'Any Available Staff',
    'selma': 'Selma Villaver',
    'robyn': 'Robyn Camacho',
    'tanisha': 'Tanisha Harris',
    'leonel': 'Leonel Sidon'
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking/staff" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Staff Selection
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Customer Information
          </h1>
          <p className="text-gray-600">
            Please provide your contact details
          </p>
        </div>

        {/* Booking Summary */}
        {selectedService && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-heading text-primary-dark mb-4">
              Booking Summary
            </h2>
            <div className="space-y-2 text-gray-600">
              <div><span className="font-medium">Service:</span> {selectedService.name}</div>
              <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
              <div><span className="font-medium">Time:</span> {selectedTime}</div>
              <div><span className="font-medium">Staff:</span> {staffMembers[selectedStaff as keyof typeof staffMembers]}</div>
              <div><span className="font-medium">Price:</span> ${selectedService.price}</div>
            </div>
          </div>
        )}

        {/* Customer Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="(671) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Any special requests or notes..."
              />
            </div>

            {/* Customer Status Checkbox */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="isNewCustomer"
                  name="isNewCustomer"
                  checked={formData.isNewCustomer}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <label htmlFor="isNewCustomer" className="text-sm font-medium text-gray-900 cursor-pointer">
                    This is my first visit to Dermal Skin Clinic
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    New customers require a $25 deposit to secure their booking. 
                    Existing customers can book without a deposit.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!formData.name || !formData.email}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                !formData.name || !formData.email
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-900'
              }`}
            >
              {formData.isNewCustomer 
                ? 'Continue to Payment ($25 Deposit)' 
                : 'Continue to Confirmation'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}