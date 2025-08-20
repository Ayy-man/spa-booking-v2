'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getServiceCategory, canDatabaseStaffPerformService, isDatabaseStaffAvailableOnDate } from '@/lib/staff-data'
import { supabaseClient, supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, StarIcon, CheckCircleIcon } from 'lucide-react'
import BookingProgressIndicator from '@/components/booking/BookingProgressIndicator'

import { InlineLoading } from '@/components/ui/loading-spinner'
import { StaffCardSkeleton } from '@/components/ui/skeleton-loader'
import { analytics } from '@/lib/analytics'
import { loadBookingState, saveBookingState } from '@/lib/booking-state-manager'
import { validateServiceSelection } from '@/lib/booking-step-validation'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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

  // Function to check if staff has a schedule block
  const checkStaffScheduleBlock = async (staffId: string, date: string, time: string, duration: number) => {
    try {
      console.log(`Checking schedule blocks for staff ${staffId} on ${date} at ${time}`)
      
      // Simplified query - get ALL blocks for this staff member
      const { data: blocks, error } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('staff_id', staffId)

      if (error) {
        console.error('Error fetching schedule blocks:', error)
        return false // Don't block if there's an error
      }

      console.log(`Found ${blocks?.length || 0} schedule blocks for ${staffId}:`, blocks)
      
      if (!blocks || blocks.length === 0) {
        return false // No blocks found
      }

      // Check each block
      for (const block of blocks) {
        // FIXED: Extract just the date part for comparison (ignore time/timezone)
        const dateOnly = date.split('T')[0] // Get just YYYY-MM-DD part
        const blockStartDateStr = block.start_date
        const blockEndDateStr = block.end_date || block.start_date
        
        console.log(`  Block ${block.id}: start=${block.start_date}, end=${block.end_date || 'null'}, type=${block.block_type}`)
        console.log(`  Checking if ${dateOnly} is between ${blockStartDateStr} and ${blockEndDateStr}`)
        
        // Compare dates as strings (YYYY-MM-DD format)
        if (dateOnly < blockStartDateStr || dateOnly > blockEndDateStr) {
          console.log(`  Date is outside block range - skipping`)
          continue // Date is outside this block's range
        }
        
        console.log(`  Date IS within block range - checking times...`)

        // If it's a full day block, staff is not available
        if (block.block_type === 'full_day') {
          console.log(`Staff ${staffId} has full day block on ${date}`)
          return true
        }

        // If it's a time range block, check if times overlap
        if (block.block_type === 'time_range' && block.start_time && block.end_time) {
          const slotStart = new Date(`2000-01-01T${time}:00`)
          const slotEnd = new Date(`2000-01-01T${time}:00`)
          slotEnd.setMinutes(slotEnd.getMinutes() + duration)
          
          const blockStart = new Date(`2000-01-01T${block.start_time}`)
          const blockEnd = new Date(`2000-01-01T${block.end_time}`)
          
          console.log(`Checking time overlap for ${staffId}:`)
          console.log(`  Appointment slot: ${time} - ${slotEnd.toTimeString().slice(0,5)}`)
          console.log(`  Schedule block: ${block.start_time} - ${block.end_time}`)
          
          // Check for overlap
          if (slotStart < blockEnd && slotEnd > blockStart) {
            console.log(`  ✓ OVERLAP DETECTED - Staff ${staffId} is BLOCKED`)
            return true
          } else {
            console.log(`  ✗ No overlap - Staff is available`)
          }
        }
      }

      return false // No blocking conflicts found
    } catch (error) {
      console.error('Error in checkStaffScheduleBlock:', error)
      return false
    }
  }

  // Remove duplicate function - using imported one from staff-data.ts

  // Track page view
  useEffect(() => {
    if (selectedService) {
      analytics.pageViewed('staff_selection', 3)
    }
  }, [selectedService])

  useEffect(() => {
    // Get data from state manager
    const state = loadBookingState()
    
    if (!state) {
      console.log('[StaffPage] No booking state found, redirecting to service selection')
      window.location.href = '/booking'
      return
    }

    // Set booking data
    if (state.bookingData) {
      setBookingData(state.bookingData)
      setSelectedService(state.bookingData.primaryService)
    } else if (state.selectedService) {
      // Fallback for backward compatibility
      const service = state.selectedService
      const fallbackBookingData = {
        isCouplesBooking: false,
        primaryService: service,
        totalPrice: service.price,
        totalDuration: service.duration
      }
      setBookingData(fallbackBookingData)
      setSelectedService(service)
    }
    
    // Set date and time
    if (state.selectedDate) setSelectedDate(state.selectedDate)
    if (state.selectedTime) setSelectedTime(state.selectedTime)
    
    // Fetch available staff if we have all required data
    if ((state.bookingData || state.selectedService) && state.selectedDate && state.selectedTime) {
      fetchAvailableStaff()
    } else {
      console.log('[StaffPage] Missing required data for staff lookup')
      // Redirect back to appropriate step
      if (!state.selectedDate || !state.selectedTime) {
        window.location.href = '/booking/date-time'
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAvailableStaff = async () => {
    setLoadingStaff(true)
    try {
      // Get the service from Supabase to get the correct ID
      const services = await supabaseClient.getServices()
      
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
      
      
      const matchingService = services.find(s => 
        s.name.toLowerCase() === selectedServiceData?.name.toLowerCase()
      )
      
      if (!matchingService) {
        // Fallback: show all active staff for now
        const allStaff = await supabaseClient.getStaff()
        const activeStaff = allStaff.filter(staff => staff.is_active && staff.id !== 'any')
        setAvailableStaff(activeStaff)
        return
      }
      
      
      // Simplified logic: Get all staff and filter by capability and availability
      const allStaff = await supabaseClient.getStaff()
      
      const dateData = localStorage.getItem('selectedDate')
      const timeData = localStorage.getItem('selectedTime')
      
      if (!dateData || !timeData) {
        // If no date/time, show all capable staff using proper capability checking
        const capableStaff = allStaff.filter(staff => {
          return staff.is_active && 
                 staff.id !== 'any' &&
                 canDatabaseStaffPerformService(staff, matchingService.category, matchingService.name)
        })
        setAvailableStaff(capableStaff)
        return
      }
      
      // Get existing bookings for the selected date to check actual availability
      const existingBookings = await supabaseClient.getBookingsByDate(dateData)
      
      const date = new Date(dateData)
      const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
      const serviceDuration = matchingService.duration || 60
      const bufferMinutes = 15
      
      // Filter staff by capability, work day availability, schedule blocks, and actual booking conflicts
      const availableStaffPromises = allStaff.map(async (staff) => {
        if (!staff.is_active || staff.id === 'any') return null
        
        const hasCapability = canDatabaseStaffPerformService(staff, matchingService.category, matchingService.name)
        const worksOnDay = isDatabaseStaffAvailableOnDate(staff, dateData)
        
        if (!hasCapability || !worksOnDay) return null
        
        // Check for schedule blocks FIRST
        const hasScheduleBlock = await checkStaffScheduleBlock(staff.id, dateData, timeData, serviceDuration)
        if (hasScheduleBlock) {
          console.log(`Staff ${staff.name} has schedule block on ${dateData} at ${timeData}`)
          return null // Staff is blocked during this time
        }
        
        // Check if staff is actually available at the selected time
        const staffBookings = existingBookings.filter(b => b.staff_id === staff.id)
        
        const slotStart = new Date(`2000-01-01T${timeData}:00`)
        const slotEnd = new Date(`2000-01-01T${timeData}:00`)
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)
        
        for (const booking of staffBookings) {
          const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
          const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
          
          // Add buffer time to existing bookings
          bookingStart.setMinutes(bookingStart.getMinutes() - bufferMinutes)
          bookingEnd.setMinutes(bookingEnd.getMinutes() + bufferMinutes)
          
          // Check for overlap
          if (slotStart < bookingEnd && slotEnd > bookingStart) {
            return null // Staff is not available due to booking conflict
          }
        }
        
        // Check room availability - try to find ANY available room that can handle this service
        const requiresRoom3 = matchingService.requires_room_3 || matchingService.category === 'body_scrub'
        
        if (requiresRoom3) {
          // Body scrubs MUST use Room 3
          const roomBookings = existingBookings.filter(b => b.room_id === 3)
          
          for (const booking of roomBookings) {
            const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
            const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
            
            // Add buffer time to existing bookings
            bookingStart.setMinutes(bookingStart.getMinutes() - bufferMinutes)
            bookingEnd.setMinutes(bookingEnd.getMinutes() + bufferMinutes)
            
            // Check for overlap
            if (slotStart < bookingEnd && slotEnd > bookingStart) {
              return null // Room 3 is not available
            }
          }
          return staff // Room 3 is available, return the staff object
        } else {
          // For non-body-scrub services, check if ANY room (1, 2, or 3) is available
          const roomsToCheck = [1, 2, 3]
          
          for (const roomId of roomsToCheck) {
            const roomBookings = existingBookings.filter(b => b.room_id === roomId)
            
            let isRoomAvailable = true
            for (const booking of roomBookings) {
              const bookingStart = new Date(`2000-01-01T${booking.start_time}`)
              const bookingEnd = new Date(`2000-01-01T${booking.end_time}`)
              
              // Add buffer time to existing bookings
              bookingStart.setMinutes(bookingStart.getMinutes() - bufferMinutes)
              bookingEnd.setMinutes(bookingEnd.getMinutes() + bufferMinutes)
              
              // Check for overlap
              if (slotStart < bookingEnd && slotEnd > bookingStart) {
                isRoomAvailable = false
                break
              }
            }
            
            if (isRoomAvailable) {
              return staff // Found at least one available room, return the staff object
            }
          }
          
          return null // No rooms available
        }
      })
      
      // Wait for all promises to resolve and filter out null values
      const availableStaffResults = await Promise.all(availableStaffPromises)
      const availableStaffForDay = availableStaffResults.filter(staff => staff !== null)
      
      setAvailableStaff(availableStaffForDay)
    } catch (error: any) {
      
      // Log error to database for debugging
      try {
        await fetch('/api/booking-errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error_type: 'staff_selection',
            error_message: error.message || 'Failed to fetch available staff',
            error_details: {
              error: error.toString(),
              stack: error.stack,
              code: error.code,
              details: error.details,
              step: 'staff_selection'
            },
            booking_data: {
              service: selectedService,
              date: selectedDate,
              time: selectedTime,
              step: 'staff_selection'
            },
            customer_name: undefined,
            customer_email: undefined,
            customer_phone: undefined,
            service_name: selectedService?.name,
            service_id: undefined,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            is_couples_booking: bookingData?.isCouplesBooking || false,
            session_id: localStorage.getItem('sessionId') || undefined
          })
        })
      } catch (logError) {
        console.error('Failed to log booking error:', logError)
      }
      
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
      // Save staff selection using state manager
      saveBookingState({ selectedStaff })
      
      // Track staff selection completion
      const staffName = selectedStaff === 'any' ? 'Any Available Staff' : availableStaff.find(s => s.id === selectedStaff)?.name || 'Unknown'
      analytics.track('staff_selected', {
        staff_name: staffName,
        staff_id: selectedStaff,
        service: selectedService?.name || 'unknown'
      })
      
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
    <>
      {/* Progress Indicator */}
      <BookingProgressIndicator />
      
      <div className="min-h-screen bg-background dark:bg-gray-900 section-spacing transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center lg:text-left">
                <div className="flex justify-between items-start mb-6">
                  <Link 
                    href={validateServiceSelection().isValid ? "/booking/date-time" : "/booking"} 
                    className="btn-tertiary !w-auto px-6 inline-flex"
                    onClick={(e) => {
                      const validation = validateServiceSelection()
                      if (!validation.isValid) {
                        e.preventDefault()
                        console.log('[StaffPage] Cannot go back: no service selected')
                        window.location.href = '/booking'
                      }
                    }}
                  >
                    ← {validateServiceSelection().isValid ? 'Back to Date & Time' : 'Back to Service Selection'}
                  </Link>
                  <ThemeToggle className="flex-shrink-0 ml-4" />
                </div>
                <h1 className="text-4xl md:text-5xl font-heading text-primary dark:text-primary mb-4">
                  Select Staff Member
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Choose your preferred therapist or let us assign the best available
                </p>
              </div>

              {/* Staff Selection */}
              <div className="card dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-3xl font-heading font-bold text-primary dark:text-primary mb-8">
                  Available Staff
                </h2>
                
                {/* Service Category Info */}
                {selectedService && (
                  <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="text-base text-blue-800 dark:text-blue-300 font-medium">
                      <span className="font-semibold">Service Category:</span> {getServiceCategory(selectedService.name).replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
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
                          ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 shadow-2xl scale-[1.02] ring-2 ring-primary/20' 
                          : 'border-dashed border-primary/50 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent hover:border-primary hover:shadow-xl hover:scale-[1.01] hover:ring-1 hover:ring-primary/30'
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
                          <h3 className="text-2xl font-bold text-primary dark:text-primary mb-2">
                            Any Available Staff
                          </h3>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-3 font-medium">
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
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xl scale-[1.01]' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:shadow-lg hover:scale-[1.005]'
                        }`}
                        onClick={() => handleStaffSelect(member.id)}
                      >
                        <div className="flex items-center space-x-6">
                          {/* Staff Photo Placeholder */}
                          <div className="w-18 h-18 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>

                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                              {member.name}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              {member.capabilities && member.capabilities.length > 0 && (
                                <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
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
                                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500'
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
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-xl p-6 z-40">
              <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-gray-700 dark:text-gray-300">
                    <div className="font-semibold text-lg">Staff Selected</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
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