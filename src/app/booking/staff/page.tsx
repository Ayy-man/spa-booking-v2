'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getServiceCategory, canDatabaseStaffPerformService, isDatabaseStaffAvailableOnDate } from '@/lib/staff-data'
import { supabaseClient } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, StarIcon, CheckCircleIcon } from 'lucide-react'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

import { InlineLoading } from '@/components/ui/loading-spinner'
import { StaffCardSkeleton } from '@/components/ui/skeleton-loader'
import { analytics } from '@/lib/analytics'
import { useBookingState, type Staff as BookingStaff } from '@/lib/booking-state-v2'

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
  
  // Use the new booking state manager
  const bookingState = useBookingState()

  // Remove duplicate function - using imported one from staff-data.ts

  // Track page view
  useEffect(() => {
    if (selectedService) {
      analytics.pageViewed('staff_selection', 3)
    }
  }, [selectedService])

  useEffect(() => {
    // Validate and redirect if this is a couples booking
    const state = bookingState.state
    if (state.bookingType === 'couples') {
      console.log('[StaffPage] Couples booking detected, redirecting to couples staff page')
      window.location.href = '/booking/staff-couples'
      return
    }
    
    // Validate that we can proceed to staff selection
    const validation = bookingState.canProceedTo('staff')
    if (!validation.isValid) {
      console.error('[StaffPage] Invalid state:', validation.errors)
      window.location.href = '/booking'
      return
    }

    // Set booking data from new state manager
    if (state.service) {
      setSelectedService(state.service)
      const bookingData: BookingData = {
        isCouplesBooking: false,
        primaryService: state.service,
        totalPrice: state.service.price,
        totalDuration: state.service.duration
      }
      setBookingData(bookingData)
    }
    
    // Set date and time from new state manager
    if (state.date) setSelectedDate(state.date)
    if (state.time) setSelectedTime(state.time)
    
    // Fetch available staff if we have all required data
    if (state.service && state.date && state.time) {
      fetchAvailableStaff(state.service, state.date, state.time)
    } else {
      console.log('[StaffPage] Missing required data for staff lookup')
      // Redirect back to date-time selection
      if (!state.date || !state.time) {
        window.location.href = '/booking/date-time'
      }
    }
  }, [])

  const fetchAvailableStaff = async (service: any, date: string, time: string) => {
    if (!service || !date || !time) {
      console.error('[StaffPage] fetchAvailableStaff called without required parameters')
      setLoadingStaff(false)
      return
    }

    setLoadingStaff(true)
    try {
      // Get the service from Supabase to get the correct ID
      const services = await supabaseClient.getServices()
      
      const matchingService = services.find(s => 
        s.name.toLowerCase() === service.name.toLowerCase()
      )
      
      if (!matchingService) {
        console.error('[StaffPage] No matching service found in database:', service.name)
        setAvailableStaff([])
        return
      }
      
      
      // Get all staff and filter by capability and availability
      const allStaff = await supabaseClient.getStaff()
      
      const appointmentDate = new Date(date)
      const dayOfWeek = appointmentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      // Filter staff by capability and work day availability using proper functions
      const availableStaffForDay = allStaff.filter(staff => {
        if (!staff.is_active || staff.id === 'any') return false
        
        const hasCapability = canDatabaseStaffPerformService(staff, matchingService.category, matchingService.name)
        const worksOnDay = isDatabaseStaffAvailableOnDate(staff, date)
        
        
        return hasCapability && worksOnDay
      })
      
      setAvailableStaff(availableStaffForDay)
    } catch (error: any) {
      
      // Fallback: Show all active staff
      try {
        const allStaff = await supabaseClient.getStaff()
        
        const activeStaff = allStaff.filter(staff => {
          return staff.is_active && staff.id !== 'any'
        })
        
        setAvailableStaff(activeStaff)
      } catch (fallbackError) {
        // Staff fetch failed, show empty state
        setAvailableStaff([])
      }
    } finally {
      setLoadingStaff(false)
    }
  }

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId)
    // Track staff selection
    if (selectedService) {
      const staffName = staffId === 'any' ? 'Any Available Staff' : availableStaff.find(s => s.id === staffId)?.name || 'Unknown'
      analytics.staffSelected(staffName, selectedService.name)
    }
  }


  const handleContinue = () => {
    if (selectedStaff) {
      // Save staff selection using new state manager
      const staffMember = selectedStaff === 'any' 
        ? { id: 'any', name: 'Any Available Staff' }
        : availableStaff.find(s => s.id === selectedStaff)
      
      if (staffMember) {
        const bookingStaff: BookingStaff = {
          id: staffMember.id,
          name: staffMember.name || 'Unknown'
        }
        bookingState.setStaff(bookingStaff)
        
        // Track staff selection completion
        analytics.track('staff_selected', {
          staff_name: bookingStaff.name,
          staff_id: bookingStaff.id,
          service: selectedService?.name || 'unknown'
        })
        
        // Navigate to next page
        const nextPage = bookingState.getNextPage('/booking/staff')
        window.location.href = nextPage
      }
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
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background section-spacing">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center lg:text-left">
                <Link 
                  href="/booking/date-time"
                  className="btn-tertiary !w-auto px-6 mb-6 inline-flex"
                >
                  ← Back to Date & Time
                </Link>
                <h1 className="text-4xl md:text-5xl font-heading text-primary mb-4">
                  Select Staff Member
                </h1>
                <p className="text-xl text-gray-600">
                  Choose your preferred therapist or let us assign the best available
                </p>
              </div>

              {/* Staff Selection */}
              <div className="card">
                <h2 className="text-3xl font-heading font-bold text-primary mb-8">
                  Available Staff
                </h2>
                
                {/* Service Category Info */}
                {selectedService && (
                  <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-base text-blue-800 font-medium">
                      <span className="font-semibold">Service Category:</span> {getServiceCategory(selectedService.name).replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Showing qualified staff available for your selected date and time
                    </p>
                  </div>
                )}
                
                {loadingStaff ? (
                  <div className="py-8">
                    <InlineLoading text="Checking staff availability..." />
                    <div className="space-y-4 mt-8">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <StaffCardSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                ) : availableStaff.length === 0 ? (
                  <Alert variant="destructive" className="p-6">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <div className="font-semibold text-lg">
                          No staff available for this time slot
                        </div>
                        <div className="text-base">
                          Please go back and select a different time.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {/* Enhanced Any Available Staff Option */}
                    <div 
                      className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-[3px] ${
                        selectedStaff === 'any' 
                          ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-2xl scale-[1.02] ring-2 ring-primary/20' 
                          : 'border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary hover:shadow-xl hover:scale-[1.01] hover:ring-1 hover:ring-primary/30'
                      }`}
                      onClick={() => handleStaffSelect('any')}
                    >
                      {/* Recommended Badge */}
                      <div className="absolute -top-3 left-6">
                        <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <StarIcon className="w-4 h-4" />
                          Most Popular
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Enhanced Icon */}
                        <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-lg">
                          <div className="text-white text-center">
                            <div className="text-xl font-bold">👥</div>
                            <div className="text-xs font-medium">Team</div>
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-primary mb-2">
                            Any Available Staff
                          </h3>
                          
                          <p className="text-gray-700 mb-3 font-medium">
                            Let us assign the perfect therapist for your treatment
                          </p>
                          
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1 text-sm text-success">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span className="font-medium">Best availability</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-success">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span className="font-medium">Expert matching</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-primary/15 text-primary border-primary/25 hover:bg-primary/20">
                              All Services
                            </Badge>
                            <Badge className="bg-success/15 text-success border-success/25">
                              Fastest Booking
                            </Badge>
                          </div>
                        </div>

                        {selectedStaff === 'any' && (
                          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full shadow-lg">
                            <CheckCircleIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Available Staff Members */}
                    {availableStaff.map((member) => (
                      <div
                        key={member.id}
                        className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
                          selectedStaff === member.id 
                            ? 'border-primary bg-primary/5 shadow-xl scale-[1.01]' 
                            : 'border-gray-200 hover:border-primary/50 hover:shadow-lg hover:scale-[1.005]'
                        }`}
                        onClick={() => handleStaffSelect(member.id)}
                      >
                        <div className="flex items-center space-x-6">
                          {/* Staff Photo Placeholder */}
                          <div className="w-18 h-18 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-2xl font-bold text-gray-600">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>

                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {member.name}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              {member.capabilities && member.capabilities.length > 0 && (
                                <p className="text-base text-gray-700 font-medium">
                                  {member.capabilities.join(', ')}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-2">
                                {(member.capabilities || []).map((serviceType, index) => (
                                  <Badge 
                                    key={index}
                                    className={`text-sm ${
                                      selectedService && serviceType === getServiceCategory(selectedService.name)
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                    }`}
                                  >
                                    {serviceType.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          {selectedStaff === member.id && (
                            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full shadow-lg">
                              <CheckCircleIcon className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* Continue Button */}
          {selectedStaff && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl p-6 z-40">
              <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-gray-700">
                    <div className="font-semibold text-lg">Staff Selected</div>
                    <div className="text-sm text-gray-500">
                      {selectedStaff === 'any' 
                        ? 'Any Available Staff - We\'ll match you with the perfect therapist' 
                        : availableStaff.find(s => s.id === selectedStaff)?.name
                      }
                    </div>
                  </div>
                  <button 
                    onClick={handleContinue}
                    className="btn-primary sm:!w-auto px-8"
                  >
                    Continue to Customer Information
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}