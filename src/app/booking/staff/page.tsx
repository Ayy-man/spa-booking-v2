'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getServiceCategory, canDatabaseStaffPerformService, isDatabaseStaffAvailableOnDate } from '@/lib/staff-data'
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

interface BookingData {
  isCouplesBooking: boolean
  primaryService: Service
  secondaryService?: Service
  totalPrice: number
  totalDuration: number
}

export default function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true)

  // Remove duplicate function - using imported one from staff-data.ts

  useEffect(() => {
    console.log('StaffPage useEffect running')
    
    // Get data from localStorage
    const bookingDataStr = localStorage.getItem('bookingData')
    const serviceDataStr = localStorage.getItem('selectedService')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')

    console.log('LocalStorage data:', {
      bookingDataStr,
      serviceDataStr,
      dateData,
      timeData
    })

    if (bookingDataStr) {
      const parsedBookingData = JSON.parse(bookingDataStr)
      setBookingData(parsedBookingData)
      setSelectedService(parsedBookingData.primaryService)
      console.log('Set booking data from bookingDataStr:', parsedBookingData)
    } else if (serviceDataStr) {
      // Fallback for backward compatibility
      const parsedService = JSON.parse(serviceDataStr)
      setSelectedService(parsedService)
      setBookingData({
        isCouplesBooking: false,
        primaryService: parsedService,
        totalPrice: parsedService.price,
        totalDuration: parsedService.duration
      })
      console.log('Set service data from serviceDataStr:', parsedService)
    }
    
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    
    // Fetch available staff from Supabase
    if ((bookingDataStr || serviceDataStr) && dateData && timeData) {
      console.log('Conditions met, calling fetchAvailableStaff')
      fetchAvailableStaff()
    } else {
      console.log('Conditions not met for fetchAvailableStaff:', {
        hasBookingOrService: !!(bookingDataStr || serviceDataStr),
        hasDate: !!dateData,
        hasTime: !!timeData
      })
    }
  }, [])

  const fetchAvailableStaff = async () => {
    console.log('fetchAvailableStaff called')
    setLoadingStaff(true)
    try {
      // Get the service from Supabase to get the correct ID
      console.log('Fetching services from Supabase...')
      const services = await supabaseClient.getServices()
      console.log('Services fetched:', services)
      
      // Get service data directly from localStorage to avoid race conditions
      const bookingDataStr = localStorage.getItem('bookingData')
      const serviceDataStr = localStorage.getItem('selectedService')
      
      let selectedServiceData = null
      
      if (bookingDataStr) {
        const parsedBookingData = JSON.parse(bookingDataStr)
        selectedServiceData = parsedBookingData.primaryService
      } else if (serviceDataStr) {
        selectedServiceData = JSON.parse(serviceDataStr)
      }
      
      console.log('Selected service data:', selectedServiceData)
      console.log('From bookingData:', bookingDataStr ? JSON.parse(bookingDataStr).primaryService : null)
      console.log('From serviceData:', serviceDataStr ? JSON.parse(serviceDataStr) : null)
      
      const matchingService = services.find(s => 
        s.name.toLowerCase() === selectedServiceData?.name.toLowerCase()
      )
      
      if (!matchingService) {
        console.log('No matching service found, using fallback logic')
        // Fallback: show all active staff for now
        const allStaff = await supabaseClient.getStaff()
        const activeStaff = allStaff.filter(staff => staff.is_active && staff.id !== 'any')
        console.log('No matching service found, showing all active staff:', activeStaff)
        setAvailableStaff(activeStaff)
        return
      }
      
      console.log('Matching service found:', matchingService)
      
      // Simplified logic: Get all staff and filter by capability and availability
      const allStaff = await supabaseClient.getStaff()
      console.log('All staff fetched:', allStaff)
      
      const dateData = localStorage.getItem('selectedDate')
      const timeData = localStorage.getItem('selectedTime')
      
      if (!dateData || !timeData) {
        // If no date/time, show all capable staff using proper capability checking
        const capableStaff = allStaff.filter(staff => {
          return staff.is_active && 
                 staff.id !== 'any' &&
                 canDatabaseStaffPerformService(staff, matchingService.category)
        })
        console.log('No date/time, showing capable staff:', capableStaff)
        setAvailableStaff(capableStaff)
        return
      }
      
      const date = new Date(dateData)
      const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      // Filter staff by capability and work day availability using proper functions
      const availableStaffForDay = allStaff.filter(staff => {
        if (!staff.is_active || staff.id === 'any') return false
        
        const hasCapability = canDatabaseStaffPerformService(staff, matchingService.category)
        const worksOnDay = isDatabaseStaffAvailableOnDate(staff, dateData)
        
        console.log(`Staff ${staff.name}: capability=${hasCapability}, worksOnDay=${worksOnDay}, category=${matchingService.category}, staffCapabilities=${JSON.stringify(staff.capabilities)}`)
        
        return hasCapability && worksOnDay
      })
      
      console.log('Staff available for this day and service:', availableStaffForDay)
      setAvailableStaff(availableStaffForDay)
    } catch (error: any) {
      console.log('Advanced availability check failed, using simple fallback:', error)
      
      // Fallback: Show all active staff
      try {
        console.log('Fallback: Fetching all staff...')
        const allStaff = await supabaseClient.getStaff()
        console.log('Fallback: All staff from database:', allStaff)
        
        const activeStaff = allStaff.filter(staff => {
          console.log('Checking staff:', staff.name, 'is_active:', staff.is_active, 'id:', staff.id)
          return staff.is_active && staff.id !== 'any'
        })
        
        console.log('Fallback: Active staff after filtering:', activeStaff)
        setAvailableStaff(activeStaff)
      } catch (fallbackError) {
        console.error('Failed to fetch staff:', fallbackError)
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
              {/* Any Available Staff Option - Custom Card */}
              <Card 
                className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                  selectedStaff === 'any' 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'border-dashed border-gray-300 hover:border-primary bg-gray-50'
                }`}
                onClick={() => handleStaffSelect('any')}
              >
                <div className="flex items-center space-x-4">
                  {/* Special Icon for Any Staff */}
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border-2 border-dashed border-primary/30">
                    <span className="text-xl font-bold text-primary">
                      AA
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      Any Available Staff
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Any qualified staff member
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        facials
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        massages
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        treatments
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        waxing
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        packages
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        special
                      </Badge>
                    </div>
                  </div>

                  {selectedStaff === 'any' && (
                    <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </Card>

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
                          {(member.capabilities || []).map((serviceType, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className={`text-xs ${
                                selectedService && serviceType === getServiceCategory(selectedService.name)
                                  ? 'border-primary text-primary bg-primary/5'
                                  : 'border-gray-300 text-gray-600'
                              }`}
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
                    selectedStaff === 'any' 
                      ? 'Any Available Staff' 
                      : availableStaff.find(s => s.id === selectedStaff)?.name
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