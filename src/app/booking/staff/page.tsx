'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  useEffect(() => {
    // Get data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')

    if (serviceData) setSelectedService(JSON.parse(serviceData))
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
  }, [])

  // Enhanced staff data with capabilities and schedules
  const allStaffMembers = [
    {
      id: 'any',
      name: 'Any Available Staff',
      email: '',
      phone: '',
      specialties: 'Any qualified staff member',
      initials: 'AA',
      capabilities: ['facials', 'waxing', 'body_treatments', 'massages'],
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      defaultRoom: null
    },
    {
      id: 'selma',
      name: 'Selma Villaver',
      email: 'happyskinhappyyou@gmail.com',
      phone: '(671) 482-7765',
      specialties: 'All Facials (except dermaplaning)',
      initials: 'SV',
      capabilities: ['facials'],
      workDays: ['monday', 'wednesday', 'friday', 'saturday', 'sunday'],
      defaultRoom: 1
    },
    {
      id: 'robyn',
      name: 'Robyn Camacho',
      email: 'robyncmcho@gmail.com',
      phone: '(671) 480-7862',
      specialties: 'Facials, Waxing, Body Treatments, Massages',
      initials: 'RC',
      capabilities: ['facials', 'waxing', 'body_treatments', 'massages'],
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      defaultRoom: 3
    },
    {
      id: 'tanisha',
      name: 'Tanisha Harris',
      email: 'misstanishababyy@gmail.com',
      phone: '(671) 747-5728',
      specialties: 'Facials and Waxing',
      initials: 'TH',
      capabilities: ['facials', 'waxing'],
      workDays: ['monday', 'wednesday', 'friday', 'saturday', 'sunday'],
      defaultRoom: 2
    },
    {
      id: 'leonel',
      name: 'Leonel Sidon',
      email: 'sidonleonel@gmail.com',
      phone: '(671) 747-1882',
      specialties: 'Body Massages and Treatments (Sundays only)',
      initials: 'LS',
      capabilities: ['massages', 'body_treatments'],
      workDays: ['sunday'],
      defaultRoom: null
    }
  ]

  // Helper function to determine service category
  const getServiceCategory = (serviceName: string): string => {
    if (!serviceName) return 'unknown'
    
    const name = serviceName.toLowerCase()
    
    if (name.includes('facial') || name.includes('microderm') || name.includes('vitamin c') || name.includes('acne')) {
      return 'facials'
    }
    if (name.includes('massage') || name.includes('balinese') || name.includes('deep tissue') || name.includes('hot stone') || name.includes('maternity')) {
      return 'massages'
    }
    if (name.includes('wax') || name.includes('brazilian') || name.includes('bikini') || name.includes('eyebrow') || name.includes('lip')) {
      return 'waxing'
    }
    if (name.includes('body') || name.includes('scrub') || name.includes('underarm') || name.includes('back treatment') || name.includes('chemical peel') || name.includes('microdermabrasion') || name.includes('moisturizing') || name.includes('mud mask')) {
      return 'body_treatments'
    }
    if (name.includes('package')) {
      return 'packages'
    }
    
    return 'unknown'
  }

  // Helper function to check if staff can perform service
  const canStaffPerformService = (staff: any, serviceCategory: string): boolean => {
    if (staff.id === 'any') return true
    return staff.capabilities.includes(serviceCategory) || staff.capabilities.includes('packages')
  }

  // Helper function to check if staff is available on selected date
  const isStaffAvailableOnDate = (staff: any, dateString: string): boolean => {
    if (!dateString || staff.id === 'any') return true
    
    const date = new Date(dateString)
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    return staff.workDays.includes(dayOfWeek)
  }

  // Filter staff based on service and date availability
  const getAvailableStaff = () => {
    const serviceCategory = selectedService ? getServiceCategory(selectedService.name) : 'unknown'
    
    return allStaffMembers.filter(staff => {
      const canPerformService = canStaffPerformService(staff, serviceCategory)
      const availableOnDate = isStaffAvailableOnDate(staff, selectedDate)
      return canPerformService && availableOnDate
    }).map(staff => ({
      ...staff,
      available: isStaffAvailableOnDate(staff, selectedDate) && canStaffPerformService(staff, serviceCategory)
    }))
  }

  const staffMembers = getAvailableStaff()

  const handleStaffSelect = (staffId: string, isAvailable: boolean) => {
    if (!isAvailable) return // Prevent selection of unavailable staff
    setSelectedStaff(staffId)
  }

  const handleContinue = () => {
    if (selectedStaff) {
      localStorage.setItem('selectedStaff', selectedStaff)
      window.location.href = '/booking/customer-info'
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking/date-time" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Date & Time
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Select Staff Member
          </h1>
          <p className="text-gray-600">
            Choose your preferred staff member or let us assign one
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
              <div><span className="font-medium">Price:</span> ${selectedService.price}</div>
            </div>
          </div>
        )}

        {/* Staff Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-heading text-primary-dark mb-6">
            Available Staff
          </h2>
          
          {/* Service Category Info */}
          {selectedService && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Service Category:</span> {getServiceCategory(selectedService.name).replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Only staff qualified for this service category are shown
              </p>
            </div>
          )}
          
          {staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">😔</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Staff Available
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedService && selectedDate 
                  ? `No staff members are available to perform ${selectedService.name} on ${formatDate(selectedDate)}.`
                  : 'No qualified staff members are available for the selected service and date.'}
              </p>
              <Link 
                href="/booking/date-time" 
                className="text-primary hover:text-primary-dark transition-colors"
              >
                ← Try a different date or time
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {staffMembers.map((staff) => {
                const isDisabled = !staff.available
                return (
                  <div
                    key={staff.id}
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      isDisabled 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                        : selectedStaff === staff.id 
                          ? 'border-primary bg-accent cursor-pointer hover:border-primary-dark' 
                          : 'border-gray-300 cursor-pointer hover:border-primary hover:shadow-sm'
                    }`}
                    onClick={() => handleStaffSelect(staff.id, staff.available)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isDisabled ? 'bg-gray-200' : 'bg-accent'
                      }`}>
                        <span className={`font-semibold ${
                          isDisabled ? 'text-gray-400' : 'text-primary'
                        }`}>{staff.initials}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${
                          isDisabled ? 'text-gray-400' : 'text-primary-dark'
                        }`}>{staff.name}</h3>
                        <p className={`text-sm ${
                          isDisabled ? 'text-gray-400' : 'text-gray-600'
                        }`}>{staff.specialties}</p>
                        {staff.phone && (
                          <p className={`text-xs ${
                            isDisabled ? 'text-gray-300' : 'text-gray-500'
                          }`}>{staff.phone}</p>
                        )}
                        <div className="flex items-center mt-1">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            staff.available ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`text-xs ${
                            isDisabled ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {staff.available ? 'Available' : 'Unavailable'}
                          </span>
                          {!staff.available && selectedDate && (
                            <span className="text-xs text-red-500 ml-2">
                              (Not working on {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })})
                            </span>
                          )}
                        </div>
                      </div>
                      <input 
                        type="radio" 
                        name="staff" 
                        value={staff.id}
                        checked={selectedStaff === staff.id}
                        onChange={() => handleStaffSelect(staff.id, staff.available)}
                        disabled={isDisabled}
                        className={`w-4 h-4 ${
                          isDisabled 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-primary cursor-pointer'
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Continue Button */}
        {selectedStaff && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Selected:</span> {
                    staffMembers.find(s => s.id === selectedStaff)?.name
                  }
                </div>
              </div>
              <button 
                onClick={handleContinue}
                className="btn-primary w-full"
              >
                Continue to Customer Information
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}