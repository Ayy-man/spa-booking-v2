'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { staffMembers, staffNameMap, getServiceCategory } from '@/lib/staff-data'
import StaffSelector from '@/components/booking/StaffSelector'
import BookingValidator from '@/components/booking/BookingValidator'

interface Service {
  name: string
  price: number
  duration: number
}

export default function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [isValidBooking, setIsValidBooking] = useState<boolean>(false)

  const getServiceCategory = (serviceName: string): string => {
    // Simple mapping based on service name keywords
    const name = serviceName.toLowerCase()
    if (name.includes('facial')) return 'facial'
    if (name.includes('massage')) return 'massage'
    if (name.includes('waxing') || name.includes('wax')) return 'waxing'
    if (name.includes('treatment') || name.includes('cleaning') || name.includes('scrub')) return 'body_treatment'
    if (name.includes('package')) return 'package'
    if (name.includes('vip') || name.includes('membership')) return 'membership'
    return 'other'
  }

  useEffect(() => {
    // Get data from localStorage
    const serviceData = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')

    if (serviceData) setSelectedService(JSON.parse(serviceData))
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
  }, [])

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId)
  }

  const handleValidationChange = (isValid: boolean, errors: string[], warnings: string[]) => {
    setIsValidBooking(isValid)
    setValidationErrors(errors)
    setValidationWarnings(warnings)
  }

  // Convert our simple data to match BookingValidator expectations
  const getValidationData = () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) {
      return { service: null, staff: null, room: null, date: null, time: null }
    }

    // Create mock service data
    const mockService = {
      id: 'mock-service',
      name: selectedService.name,
      description: null,
      duration: selectedService.duration,
      price: selectedService.price,
      category: getServiceCategory(selectedService.name),
      requires_couples_room: selectedService.name.toLowerCase().includes('couples'),
      requires_body_scrub_room: selectedService.name.toLowerCase().includes('scrub'),
      is_package: selectedService.name.toLowerCase().includes('package'),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Find selected staff member
    const staffMember = staffMembers.find(s => s.id === selectedStaff)
    const mockStaff = staffMember ? {
      id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || null,
      is_active: true,
      can_perform_services: staffMember.capabilities,
      default_room_id: staffMember.defaultRoom ? `room-${staffMember.defaultRoom}` : null,
      schedule: { [new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: true }, 
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null

    // Create mock room data
    const mockRoom = {
      id: 'room-1',
      name: 'Room 1',
      room_number: 1,
      capacity: 1,
      capabilities: ['facials', 'waxing'],
      has_body_scrub_equipment: false,
      is_couples_room: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return {
      service: mockService,
      staff: mockStaff,
      room: mockRoom,
      date: new Date(selectedDate),
      time: selectedTime
    }
  }

  const validationData = getValidationData()

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
          
          <StaffSelector
            staff={staffMembers}
            selectedStaffId={selectedStaff}
            onStaffSelect={handleStaffSelect}
            service={selectedService}
            selectedDate={selectedDate ? new Date(selectedDate) : null}
            showAnyOption={true}
          />
        </div>

        {/* Booking Validation */}
        {selectedService && selectedStaff && selectedDate && selectedTime && (
          <div className="mb-8">
            <BookingValidator
              service={validationData.service}
              staff={validationData.staff}
              room={validationData.room}
              date={validationData.date}
              time={validationData.time}
              onValidationChange={handleValidationChange}
            />
          </div>
        )}

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
                disabled={!isValidBooking && validationErrors.length > 0}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  (!isValidBooking && validationErrors.length > 0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-900'
                }`}
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