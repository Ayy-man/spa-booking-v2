'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getServiceCategory } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

type Staff = Database['public']['Tables']['staff']['Row']

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
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true)

  const getServiceCategory = (serviceName: string): string => {
    // Simple mapping based on service name keywords
    const name = serviceName.toLowerCase()
    if (name.includes('facial')) return 'facials'
    if (name.includes('massage')) return 'massages'
    if (name.includes('waxing') || name.includes('wax')) return 'waxing'
    if (name.includes('treatment') || name.includes('cleaning') || name.includes('scrub')) return 'body_treatments'
    if (name.includes('package')) return 'packages'
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
    
    // Fetch available staff from Supabase
    if (serviceData && dateData && timeData) {
      fetchAvailableStaff()
    }
  }, [])

  const fetchAvailableStaff = async () => {
    setLoadingStaff(true)
    try {
      // Get the service from Supabase to get the correct ID
      const services = await supabaseClient.getServices()
      const serviceData = localStorage.getItem('selectedService')
      const selectedServiceData = serviceData ? JSON.parse(serviceData) : null
      
      const matchingService = services.find(s => 
        s.name.toLowerCase() === selectedServiceData?.name.toLowerCase()
      )
      
      if (!matchingService) {
        console.error('Service not found in database')
        setLoadingStaff(false)
        return
      }
      
      const dateData = localStorage.getItem('selectedDate')
      const timeData = localStorage.getItem('selectedTime')
      
      if (!dateData || !timeData) {
        console.error('Date or time not selected')
        setLoadingStaff(false)
        return
      }
      
      const date = new Date(dateData)
      const dateString = date.toISOString().split('T')[0]
      
      // Get available time slots which includes staff info
      const availableSlots = await supabaseClient.getAvailableTimeSlots(
        dateString,
        matchingService.id
      )
      
      // Filter for the selected time
      const slotsForTime = availableSlots.filter((slot: any) => slot.available_time === timeData)
      
      // Get unique staff IDs from the available slots
      const uniqueStaffIds = Array.from(new Set(slotsForTime.map((slot: any) => slot.available_staff_id)))
      
      // Fetch full staff details
      if (uniqueStaffIds.length > 0) {
        const staffDetails = await supabaseClient.getStaff()
        const availableStaffDetails = staffDetails.filter(staff => 
          uniqueStaffIds.includes(staff.id)
        )
        setAvailableStaff(availableStaffDetails)
      } else {
        setAvailableStaff([])
      }
    } catch (error: any) {
      console.error('Error fetching available staff:', error)
      console.log('Falling back to showing all active staff')
      
      // Fallback: Show all active staff who work on this day
      try {
        const allStaff = await supabaseClient.getStaff()
        // Get date from localStorage again for fallback
        const dateData = localStorage.getItem('selectedDate')
        if (!dateData) {
          setAvailableStaff([])
          return
        }
        const fallbackDate = new Date(dateData)
        const dayOfWeek = fallbackDate.getDay()
        
        const availableStaffMembers = allStaff.filter(staff => {
          // Check if staff works on this day
          return staff.is_active && staff.work_days.includes(dayOfWeek)
        })
        
        console.log('Fallback staff found:', availableStaffMembers.length)
        setAvailableStaff(availableStaffMembers)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        setAvailableStaff([])
      }
    } finally {
      setLoadingStaff(false)
    }
  }

  const handleStaffSelect = (staffId: string) => {
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
                Showing staff available for your selected date and time
              </p>
            </div>
          )}
          
          {loadingStaff ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto"></div>
                Checking staff availability...
              </div>
            </div>
          ) : availableStaff.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    No staff available for this time slot
                  </div>
                  <div className="text-sm">
                    Please go back and select a different time.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Available Staff Members */}
              {availableStaff.map((member) => (
                <Card 
                  key={member.id}
                  className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedStaff === member.id 
                      ? 'ring-2 ring-primary border-primary bg-accent/20' 
                      : 'hover:border-accent'
                  }`}
                  onClick={() => handleStaffSelect(member.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Staff Photo Placeholder */}
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-gray-600">
                        {member.initials || member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-dark mb-1">
                        {member.name}
                      </h3>
                      
                      <div className="space-y-1 mb-3">
                        {member.specialties && (
                          <p className="text-sm text-gray-600">
                            {member.specialties}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          {member.capabilities.map((serviceType, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className="text-xs border-primary text-primary bg-primary/5"
                            >
                              {serviceType.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedStaff === member.id && (
                      <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Internal validation happens in the background */}

        {/* Continue Button */}
        {selectedStaff && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Selected:</span> {
                    availableStaff.find(s => s.id === selectedStaff)?.name
                  }
                </div>
              </div>
              <button 
                onClick={handleContinue}
                className="w-full py-3 px-6 rounded-lg font-medium transition-colors bg-black text-white hover:bg-gray-900"
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