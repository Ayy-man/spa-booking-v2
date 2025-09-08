"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { supabase, supabaseClient } from "@/lib/supabase"
import { useSmartInterval } from "@/hooks/use-smart-interval"
import { getGuamTime as getGuamTimeUtil, formatGuamTime } from "@/lib/timezone-utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { normalizePhoneForDB, formatPhoneNumber } from "@/lib/phone-utils"
import { BookingWithRelations, ServiceCategory, ScheduleBlock } from "@/types/booking"
import { Calendar, Clock, Printer, RefreshCw, ChevronLeft, ChevronRight, Loader2, Users, UserCheck, AlertCircle, Phone, XCircle } from "lucide-react"
import { format } from "date-fns"
import { CouplesBookingIndicator } from "@/components/ui/couples-booking-indicator"
import { BookingDetailsModal } from "@/components/admin/BookingDetailsModal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ghlWebhookSender } from "@/lib/ghl-webhook-sender"
import { getScheduleBlocks, checkScheduleBlockConflict } from "@/lib/booking-logic"
import { StaffAvailabilityStatus, AVAILABILITY_STATUS_CONFIG, getStatusDisplay } from "@/types/staff-availability"

// Service category colors (matching existing color scheme)
const SERVICE_COLORS: Record<ServiceCategory, { bg: string; border: string; text: string }> = {
  facial: { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  massage: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  body_treatment: { bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  body_scrub: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
  waxing: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  package: { bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800" },
  membership: { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800" },
  consultation: { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800" }
}

// Business hours configuration
const BUSINESS_HOURS = {
  start: 9,  // 9 AM (business starts at 9)
  end: 19,   // 7 PM  
  slotDuration: 15 // 15 minutes
}

interface TimeSlot {
  hour: number
  minute: number
  timeString: string
  displayTime: string
}

interface StaffMember {
  id: string
  name: string
  work_days: number[]
  is_active: boolean
  current_status?: StaffAvailabilityStatus
  default_advance_notice_hours?: number
}

interface StaffScheduleViewProps {
  className?: string
  selectedDate?: Date
  autoRefresh?: boolean
  refreshInterval?: number
}

export function StaffScheduleView({ 
  className,
  selectedDate = new Date(),
  autoRefresh = true,
  refreshInterval = 30000
}: StaffScheduleViewProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate)
  // Get current time in Guam timezone
  const getGuamTime = () => {
    return getGuamTimeUtil()
  }
  
  const [currentTime, setCurrentTime] = useState<Date>(getGuamTime())
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSlot, setQuickAddSlot] = useState<{ staffId: string; staffName: string; time: string; isAnyStaff?: boolean } | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [scheduleBlocks, setScheduleBlocks] = useState<Record<string, ScheduleBlock[]>>({})
  const [quickAddForm, setQuickAddForm] = useState({
    serviceId: '',
    customerId: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerEmail: '',
    isNewCustomer: false,
    notes: ''
  })
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const printRef = useRef<HTMLDivElement>(null)

  // Generate time slots
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      for (let minute = 0; minute < 60; minute += BUSINESS_HOURS.slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayHour = hour % 12 || 12
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
        slots.push({ hour, minute, timeString, displayTime })
      }
    }
    return slots
  }, [])

  // Fetch services, customers and rooms for quick add
  const fetchQuickAddData = useCallback(async () => {
    try {
      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name')

      setServices(servicesData || [])

      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .order('first_name')

      setCustomers(customersData || [])

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('id')

      setRooms(roomsData || [])
    } catch (error) {
      console.error('Error fetching quick add data:', error)
    }
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Fetch active staff with availability status
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, work_days, is_active, current_status, default_advance_notice_hours')
        .eq('is_active', true)
        .neq('id', 'any') // Exclude "Any Available Staff"
        .order('name')

      if (staffError) throw staffError
      
      // Debug: Log staff data to check work_days
      
      setStaff(staffData || [])

      // Fetch bookings for the day
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(first_name, last_name, phone)
        `)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled')
        .order('start_time')

      if (bookingsError) throw bookingsError
      setBookings(bookingsData || [])
      
      // Fetch schedule blocks for all staff
      const scheduleBlocksMap: Record<string, ScheduleBlock[]> = {}
      if (staffData && staffData.length > 0) {
        await Promise.all(
          staffData.map(async (staffMember) => {
            const blocks = await getScheduleBlocks(staffMember.id, currentDate)
            scheduleBlocksMap[staffMember.id] = blocks
          })
        )
      }
      setScheduleBlocks(scheduleBlocksMap)
      
      setError('')
    } catch (err: any) {
      setError(`Failed to load schedule: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  // Initial data fetch
  useEffect(() => {
    fetchData()
    fetchQuickAddData()
  }, [fetchData, fetchQuickAddData])

  // Smart auto-refresh that pauses when tab is hidden
  useSmartInterval(fetchData, {
    interval: autoRefresh ? refreshInterval : Number.MAX_SAFE_INTEGER,
    onlyWhenVisible: true,
    onlyWhenActive: false // Always refresh when visible, regardless of activity
  })

  // Smart timer for current time updates
  useSmartInterval(() => {
    setCurrentTime(getGuamTime())
  }, {
    interval: 60000, // Update every minute
    onlyWhenVisible: true,
    onlyWhenActive: false
  })

  // Check if staff is working on current day
  const isStaffWorking = (staffMember: StaffMember): boolean => {
    const dayOfWeek = currentDate.getDay()
    
    // Check if there's a full-day schedule block
    const blocks = scheduleBlocks[staffMember.id] || []
    const hasFullDayBlock = blocks.some(block => block.block_type === 'full_day')
    if (hasFullDayBlock) {
      return false // Staff is not working if there's a full-day block
    }
    
    // Fallback schedules if work_days is empty or undefined
    if (!staffMember.work_days || staffMember.work_days.length === 0) {
      // Use known schedules as fallback
      const schedules: Record<string, number[]> = {
        'Selma Villaver': [0,1,2,3,4,5,6], // All 7 days
        'Robyn Camacho': [0,3,4,5,6],      // OFF Mon & Tue
        'Tanisha Harris': [0,1,3,5,6],     // OFF Tue & Thu
        'Leonel Sidon': [0,3,4,5,6]        // OFF Mon & Tue (same as Robyn)
      }
      
      const fallbackDays = schedules[staffMember.name]
      if (fallbackDays) {
        return fallbackDays.includes(dayOfWeek)
      }
    }
    
    return staffMember.work_days.includes(dayOfWeek)
  }
  
  // Check if a specific time slot is blocked for a staff member
  const isTimeSlotBlocked = (staffId: string, timeSlot: TimeSlot): boolean => {
    const blocks = scheduleBlocks[staffId] || []
    
    // Check for time-range blocks
    const timeString = timeSlot.timeString
    const slotEndTime = format(
      new Date(2000, 0, 1, timeSlot.hour, timeSlot.minute + BUSINESS_HOURS.slotDuration),
      'HH:mm'
    )
    
    const conflict = checkScheduleBlockConflict(blocks, timeString, slotEndTime, currentDate)
    return conflict.hasConflict
  }

  // Check if a time slot is within a buffer zone
  const isBufferBooking = (booking: BookingWithRelations): boolean => {
    return booking.booking_type === 'buffer' || booking.service?.name === 'Buffer Time'
  }
  
  // Get bookings for a specific staff and time slot
  const getBookingForSlot = (staffId: string, timeSlot: TimeSlot): BookingWithRelations | null => {
    return bookings.find(booking => {
      if (booking.staff_id !== staffId) return false
      
      const bookingStart = booking.start_time.split(':')
      const bookingStartHour = parseInt(bookingStart[0])
      const bookingStartMinute = parseInt(bookingStart[1])
      
      const bookingEnd = booking.end_time.split(':')
      const bookingEndHour = parseInt(bookingEnd[0])
      const bookingEndMinute = parseInt(bookingEnd[1])
      
      const slotMinutes = timeSlot.hour * 60 + timeSlot.minute
      const startMinutes = bookingStartHour * 60 + bookingStartMinute
      const endMinutes = bookingEndHour * 60 + bookingEndMinute
      
      return slotMinutes >= startMinutes && slotMinutes < endMinutes
    }) || null
  }

  // Get available staff for a specific time slot
  const getAvailableStaffForSlot = (timeSlot: TimeSlot): {
    count: number;
    availableStaff: StaffMember[];
    totalWorking: number;
  } => {
    const workingStaff = staff.filter(isStaffWorking)
    const available = workingStaff.filter(member => 
      !getBookingForSlot(member.id, timeSlot)
    )
    return {
      count: available.length,
      availableStaff: available,
      totalWorking: workingStaff.length
    }
  }

  // Get color for availability indicator
  const getAvailabilityColor = (available: number, total: number): string => {
    if (total === 0) return 'bg-gray-100 text-gray-600'
    if (available === 0) return 'bg-red-100 text-red-800'
    const percentage = (available / total) * 100
    if (percentage <= 25) return 'bg-orange-100 text-orange-800'
    if (percentage <= 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  // Calculate booking span (how many 15-minute slots it covers)
  const getBookingSpan = (booking: BookingWithRelations): number => {
    const duration = booking.service.duration || 60
    return Math.ceil(duration / BUSINESS_HOURS.slotDuration)
  }

  // Check if this is the start of a booking
  const isBookingStart = (booking: BookingWithRelations, timeSlot: TimeSlot): boolean => {
    const [startHour, startMinute] = booking.start_time.split(':').map(Number)
    return startHour === timeSlot.hour && startMinute === timeSlot.minute
  }

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle quick add appointment click
  const handleQuickAdd = (staffId: string, timeSlot: TimeSlot, isAnyStaff: boolean = false) => {
    // Check if slot is available
    if (!isAnyStaff) {
      const existingBooking = getBookingForSlot(staffId, timeSlot)
      if (existingBooking) return
    }
    
    const staffMember = staff.find(s => s.id === staffId)
    setQuickAddSlot({ 
      staffId, 
      staffName: staffMember?.name || '', 
      time: timeSlot.timeString,
      isAnyStaff 
    })
    setShowQuickAdd(true)
    // Reset form
    setQuickAddForm({
      serviceId: '',
      customerId: '',
      customerFirstName: '',
      customerLastName: '',
      customerPhone: '',
      customerEmail: '',
      isNewCustomer: false,
      notes: ''
    })
  }

  // Handle click on Any Available Staff slot
  const handleAnyStaffClick = (timeSlot: TimeSlot) => {
    const availability = getAvailableStaffForSlot(timeSlot)
    if (availability.count === 0) return
    
    // Use the first available staff member
    const firstAvailable = availability.availableStaff[0]
    if (firstAvailable) {
      handleQuickAdd(firstAvailable.id, timeSlot, true)
    }
  }

  // Handle quick add submit
  const handleQuickAddSubmit = async () => {
    if (!quickAddSlot) return

    setQuickAddLoading(true)
    try {
      const selectedService = services.find(s => s.id === quickAddForm.serviceId)
      if (!selectedService) {
        throw new Error('Please select a service')
      }

      // Calculate end time based on service duration
      const startTime = quickAddSlot.time
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const endTimeDate = new Date(2000, 0, 1, startHour, startMinute)
      endTimeDate.setMinutes(endTimeDate.getMinutes() + (selectedService.duration || 60))
      const endTime = `${endTimeDate.getHours().toString().padStart(2, '0')}:${endTimeDate.getMinutes().toString().padStart(2, '0')}`

      // Validate service has required data
      if (!selectedService.duration || selectedService.duration <= 0) {
        throw new Error('Invalid service duration. Please select a different service.')
      }
      if (selectedService.price === undefined || selectedService.price === null) {
        throw new Error('Invalid service price. Please select a different service.')
      }

      let customerId = quickAddForm.customerId

      // Create new customer if needed
      if (quickAddForm.isNewCustomer) {
        if (!quickAddForm.customerFirstName || !quickAddForm.customerLastName || !quickAddForm.customerPhone) {
          throw new Error('Please fill in all customer fields')
        }

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: quickAddForm.customerFirstName,
            last_name: quickAddForm.customerLastName,
            phone: normalizePhoneForDB(quickAddForm.customerPhone),
            email: quickAddForm.customerEmail || null
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      } else if (!customerId) {
        throw new Error('Please select a customer')
      }

      // Calculate end time (already calculated above, just use it)

      // Determine optimal room
      let roomId = null
      
      // Special room requirements
      if (selectedService.category === 'body_scrub') {
        // Body scrubs must use Room 3
        roomId = rooms.find(r => r.id === 3)?.id
      } else if (selectedService.name.toLowerCase().includes('couples')) {
        // Couples services prefer Room 2 or 3 (capacity 2)
        const couplesRoom = rooms.find(r => (r.id === 2 || r.id === 3) && r.capacity >= 2)
        roomId = couplesRoom?.id || rooms.find(r => r.capacity >= 2)?.id
      } else {
        // Regular services can use any available room
        roomId = rooms.find(r => r.id === 1)?.id || rooms[0]?.id
      }

      if (!roomId) {
        throw new Error('No suitable room available')
      }

      // Create the booking with all required fields
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          service_id: quickAddForm.serviceId,
          staff_id: quickAddSlot.staffId,
          room_id: roomId,
          appointment_date: currentDate.toISOString().split('T')[0],
          start_time: quickAddSlot.time,
          end_time: endTime,
          duration: selectedService.duration, // REQUIRED: Add duration
          total_price: selectedService.price, // REQUIRED: Add total price
          discount: 0, // REQUIRED: Add discount (default 0)
          final_price: selectedService.price, // REQUIRED: Add final price
          status: 'confirmed',
          payment_status: 'pending', // Add payment status
          payment_option: 'pay_on_location', // Default payment option for quick add
          notes: quickAddForm.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Send confirmation webhook for new booking created by admin
      if (newBooking) {
        try {
          
          // Get customer details for webhook
          const customerData = quickAddForm.isNewCustomer ? {
            name: `${quickAddForm.customerFirstName} ${quickAddForm.customerLastName}`,
            email: quickAddForm.customerEmail || '',
            phone: quickAddForm.customerPhone || '',
            isNewCustomer: true
          } : {
            name: customers.find(c => c.id === customerId)?.first_name + ' ' + customers.find(c => c.id === customerId)?.last_name || 'Customer',
            email: customers.find(c => c.id === customerId)?.email || '',
            phone: customers.find(c => c.id === customerId)?.phone || '',
            isNewCustomer: false
          }

          // Get staff name
          const staffName = quickAddSlot.isAnyStaff 
            ? staff.find(s => s.id === quickAddSlot.staffId)?.name || 'Staff'
            : quickAddSlot.staffName

          // Map service category for webhook
          const getCategoryForWebhook = (category: string) => {
            const categoryMap: Record<string, string> = {
              'facial': 'facial',
              'massage': 'massage',
              'body_treatment': 'body_treatment',
              'body_scrub': 'body_treatment',
              'waxing': 'waxing',
              'package': 'package'
            }
            return categoryMap[category] || category
          }

          const result = await ghlWebhookSender.sendBookingConfirmationWebhook(
            newBooking.id,
            customerData,
            {
              service: selectedService.name,
              serviceId: selectedService.id,
              serviceCategory: getCategoryForWebhook(selectedService.category),
              date: currentDate.toISOString().split('T')[0],
              time: quickAddSlot.time,
              duration: selectedService.duration,
              price: selectedService.price,
              staff: staffName,
              staffId: quickAddSlot.staffId,
              room: roomId.toString(),
              roomId: roomId.toString()
            }
          )

          if (result.success) {
          } else {
            console.error('[ADMIN QUICK ADD] Failed to send webhook:', result.error)
            // Don't throw error - webhook failure shouldn't stop the booking
          }
        } catch (webhookError) {
          console.error('[ADMIN QUICK ADD] Error sending confirmation webhook:', webhookError)
          // Don't throw - continue even if webhook fails
        }
      }

      // Refresh the schedule
      await fetchData()
      
      // Close the dialog
      setShowQuickAdd(false)
      setQuickAddSlot(null)
      
      // Show success message
      setError('') // Clear any previous errors
      setSuccessMessage('Appointment created and confirmation sent to customer')
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to create appointment'
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        errorMessage = 'This time slot is already booked. Please refresh and try again.'
      } else if (error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
        errorMessage = 'Invalid data selection. Please refresh and try again.'
      } else if (error.message.includes('null value')) {
        errorMessage = 'Missing required information. Please ensure all fields are filled.'
      } else if (error.message) {
        errorMessage = error.message
      }
      setError(errorMessage)
    } finally {
      setQuickAddLoading(false)
    }
  }


  // Format customer name
  const formatCustomerName = (booking: BookingWithRelations, fullName: boolean = false): string => {
    if (booking.customer) {
      if (fullName) {
        return booking.customer.last_name 
          ? `${booking.customer.first_name} ${booking.customer.last_name}`
          : booking.customer.first_name
      }
      return booking.customer.last_name 
        ? `${booking.customer.first_name} ${booking.customer.last_name[0]}.`
        : booking.customer.first_name
    }
    return 'Customer'
  }

  // Check if a time slot is the current time slot
  const isCurrentTimeSlot = (slot: TimeSlot): boolean => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Check if we're in business hours
    if (currentHour < BUSINESS_HOURS.start || currentHour >= BUSINESS_HOURS.end) {
      return false
    }
    
    // Check if this slot matches the current time
    // We're in the slot if current time is >= slot time and < slot time + 15 minutes
    const slotStartMinutes = slot.hour * 60 + slot.minute
    const currentMinutes = currentHour * 60 + currentMinute
    const slotEndMinutes = slotStartMinutes + BUSINESS_HOURS.slotDuration
    
    return currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes
  }

  // Check if we're viewing today
  const isToday = currentDate.toDateString() === new Date().toDateString()

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading staff schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2 px-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-lg">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {!isToday && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToToday}
                  className="ml-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Schedule Grid */}
      <Card className="overflow-hidden printable-content" ref={printRef}>
        {/* Print-only legend */}
        <div className="hidden print:block print-legend">
          <div className="print-legend-item">
            <div className="print-legend-color print-facial"></div>
            <span>Facial</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-color print-massage"></div>
            <span>Massage</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-color print-body_treatment"></div>
            <span>Body Treatment</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-color print-body_scrub"></div>
            <span>Body Scrub</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-color print-waxing"></div>
            <span>Waxing</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-color print-package"></div>
            <span>Package</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[800px] relative">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_180px_repeat(auto-fit,minmax(150px,1fr))] border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 font-medium text-gray-700 border-r bg-white">
                Time
              </div>
              {/* Any Available Staff Column Header */}
              <div className="p-3 font-medium text-center border-r bg-gray-50 text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Any Available Staff</span>
                </div>
                <div className="text-xs font-normal mt-1 text-gray-500">
                  Click to quick add
                </div>
              </div>
              <TooltipProvider>
                {staff.map(member => {
                  const status = member.current_status || 'working'
                  const statusConfig = AVAILABILITY_STATUS_CONFIG[status]
                  const isWorking = isStaffWorking(member)
                  
                  return (
                    <div 
                      key={member.id} 
                      className={cn(
                        "p-3 font-medium text-center border-r relative",
                        !isWorking && "bg-gray-100 text-gray-400",
                        status === 'off' && "bg-gray-100"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{member.name}</span>
                        {status === 'on_call' && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Phone className="h-3 w-3 text-yellow-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              On Call - {member.default_advance_notice_hours || 2}h notice required
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {status === 'off' && (
                          <Tooltip>
                            <TooltipTrigger>
                              <XCircle className="h-3 w-3 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Off - Not available for bookings
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {!isWorking && (
                        <div className="text-xs font-normal mt-1">Off today</div>
                      )}
                      {status !== 'working' && (
                        <Badge 
                          className={cn(
                            "text-xs mt-1",
                            statusConfig.bgColor,
                            statusConfig.color,
                            statusConfig.borderColor,
                            "border"
                          )}
                        >
                          {getStatusDisplay(status, member.default_advance_notice_hours)}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </TooltipProvider>
            </div>
            
            {/* Time Slots */}
            <div>
              {timeSlots.map((slot, slotIndex) => {
                const isHourStart = slot.minute === 0
                const isCurrentSlot = isToday && isCurrentTimeSlot(slot)
                
                return (
                  <div 
                    key={slot.timeString}
                    className={cn(
                      "grid grid-cols-[100px_180px_repeat(auto-fit,minmax(150px,1fr))] border-t",
                      isCurrentSlot ? "bg-red-100 border-red-400 shadow-md" : "",
                      !isCurrentSlot && isHourStart && "border-gray-300",
                      !isCurrentSlot && !isHourStart && "border-gray-200"
                    )}
                  >
                    {/* Time Column - Show all times clearly */}
                    <div className={cn(
                      "h-8 flex items-center justify-center text-sm border-r",
                      isCurrentSlot ? "font-bold bg-red-500 text-white" :
                      isHourStart ? "font-bold bg-primary/10 text-primary" : 
                      slot.minute === 30 ? "font-semibold bg-gray-100 text-gray-700" :
                      "bg-gray-50 text-gray-600"
                    )}>
                      <span className={isHourStart || isCurrentSlot ? "text-sm" : "text-xs"}>
                        {slot.displayTime}
                      </span>
                    </div>
                    
                    {/* Any Available Staff Column */}
                    {(() => {
                      const availability = getAvailableStaffForSlot(slot)
                      const canAddAppointment = availability.count > 0
                      const isHourStart = slot.minute === 0
                      
                      return (
                        <div className="border-r">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "h-8 px-2 flex items-center justify-center transition-all relative",
                                    canAddAppointment && "cursor-pointer hover:bg-gray-50",
                                    !canAddAppointment && "cursor-not-allowed opacity-30",
                                    availability.totalWorking === 0 && "bg-gray-50"
                                  )}
                                  onClick={() => canAddAppointment && handleAnyStaffClick(slot)}
                                >
                                  {/* Empty cell - times now shown in time column */}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {availability.totalWorking === 0 ? (
                                  <p className="text-xs">No staff scheduled for today</p>
                                ) : availability.count === 0 ? (
                                  <p className="text-xs">All staff are booked at this time</p>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium">Available Staff: {availability.count}</p>
                                    <p className="text-xs">
                                      {availability.availableStaff.map(s => s.name).join(', ')}
                                    </p>
                                    <p className="text-xs text-gray-500 pt-1 border-t">
                                      Click to add appointment
                                    </p>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )
                    })()}
                    
                    {/* Staff Columns */}
                    {staff.map(member => {
                      const booking = getBookingForSlot(member.id, slot)
                      const isStart = booking && isBookingStart(booking, slot)
                      const isWorking = isStaffWorking(member)
                      const isBuffer = booking && isBufferBooking(booking)
                      
                      // Skip rendering if this slot is covered by a previous booking
                      if (booking && !isStart) {
                        return <div key={member.id} className="border-r" />
                      }
                      
                      if (booking && isStart) {
                        const span = getBookingSpan(booking)
                        
                        // Check if this is a buffer appointment
                        if (isBuffer) {
                          // Render buffer appointment as simple off-white block
                          return (
                            <div 
                              key={member.id}
                              className="border-r relative"
                              style={{ gridRow: `span ${span}` }}
                            >
                              <div className="absolute inset-x-1 inset-y-1 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">Buffer</span>
                              </div>
                            </div>
                          )
                        }
                        
                        const serviceColors = SERVICE_COLORS[booking.service.category as ServiceCategory] || 
                                           { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-800" }
                        
                        return (
                          <div 
                            key={member.id}
                            className="border-r relative"
                            style={{ gridRow: `span ${span}` }}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute inset-x-1 inset-y-1 p-2 rounded cursor-pointer transition-all hover:shadow-md",
                                      serviceColors.bg,
                                      serviceColors.border,
                                      serviceColors.text,
                                      "border-2",
                                      // Print-specific classes
                                      "print-appointment",
                                      `print-${booking.service.category}`
                                    )}
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    {/* Couples Booking Indicator */}
                                    {booking.booking_type === 'couple' && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                        <Users className="w-2 h-2 text-white" />
                                      </div>
                                    )}
                                    <div className={cn("text-xs font-medium truncate", "print-customer-name")}>
                                      <span className="hidden print:inline">{formatCustomerName(booking, true)}</span>
                                      <span className="print:hidden">{formatCustomerName(booking)}</span>
                                    </div>
                                    <div className={cn("text-xs truncate mt-1 opacity-90", "print-service-name")}>
                                      {booking.service.name}
                                      {booking.booking_type === 'couple' && (
                                        <span className="ml-1 text-purple-700 font-medium">(C)</span>
                                      )}
                                    </div>
                                    {booking.service.duration > 60 && (
                                      <div className="text-xs mt-1 opacity-75 print:hidden">
                                        {booking.service.duration} min
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {booking.service.name}
                                      {booking.booking_type === 'couple' && (
                                        <span className="ml-2 text-purple-600 text-xs">(Couples Booking)</span>
                                      )}
                                    </p>
                                    <p>{formatCustomerName(booking)}</p>
                                    <p>{booking.start_time} - {booking.end_time}</p>
                                    <p>Room {booking.room?.name}</p>
                                    {booking.notes && <p className="text-xs">Note: {booking.notes}</p>}
                                    {booking.booking_type === 'couple' && (
                                      <div className="pt-1 border-t border-gray-200">
                                        <CouplesBookingIndicator bookingType="couple" size="sm" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )
                      }
                      
                      return (
                        <div 
                          key={member.id}
                          className={cn(
                            "border-r h-8 transition-colors relative",
                            !isWorking && "bg-gray-100 cursor-not-allowed",
                            isWorking && isTimeSlotBlocked(member.id, slot) && "bg-gray-200 cursor-not-allowed",
                            isWorking && !isTimeSlotBlocked(member.id, slot) && "hover:bg-gray-50 cursor-pointer"
                          )}
                          onClick={() => isWorking && !isTimeSlotBlocked(member.id, slot) && handleQuickAdd(member.id, slot, false)}
                        >
                          {isWorking && isTimeSlotBlocked(member.id, slot) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Blocked</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Service Categories:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SERVICE_COLORS).map(([category, colors]) => (
                <div key={category} className="flex items-center space-x-1">
                  <div className={cn("w-3 h-3 rounded", colors.bg, colors.border)} />
                  <span className="text-xs text-gray-600 capitalize">
                    {category.replace('_', ' ')}
                  </span>
                </div>
              ))}
              <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-gray-300">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-600">Couples Booking</span>
              </div>
            </div>
          </div>
          
          {isToday && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-0.5 bg-red-500" />
              <span className="text-xs text-gray-600">Current Time (Guam)</span>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Add Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={(open) => {
        setShowQuickAdd(open)
        if (!open) setError('') // Clear error when closing
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Appointment</DialogTitle>
            <DialogDescription>
              {quickAddSlot?.isAnyStaff ? (
                <>Add a new appointment at {quickAddSlot?.time} with any available staff</>
              ) : (
                <>Add a new appointment for {quickAddSlot?.staffName} at {quickAddSlot?.time}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Staff Selection (only for Any Available) */}
            {quickAddSlot?.isAnyStaff && (
              <div className="space-y-2">
                <Label htmlFor="staff">Select Staff *</Label>
                <Select
                  value={quickAddSlot.staffId}
                  onValueChange={(value) => {
                    const selectedStaff = staff.find(s => s.id === value)
                    if (selectedStaff && quickAddSlot) {
                      setQuickAddSlot({
                        ...quickAddSlot,
                        staffId: value,
                        staffName: selectedStaff.name
                      })
                    }
                  }}
                >
                  <SelectTrigger id="staff">
                    <SelectValue placeholder="Choose available staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const timeSlot = timeSlots.find(s => s.timeString === quickAddSlot?.time)
                      if (!timeSlot) return null
                      const availability = getAvailableStaffForSlot(timeSlot)
                      return availability.availableStaff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="service">Service *</Label>
              <Select
                value={quickAddForm.serviceId}
                onValueChange={(value) => setQuickAddForm({ ...quickAddForm, serviceId: value })}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.duration} min - ${service.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection or New Customer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Customer *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setQuickAddForm({ ...quickAddForm, isNewCustomer: !quickAddForm.isNewCustomer })}
                >
                  {quickAddForm.isNewCustomer ? 'Select Existing' : 'New Customer'}
                </Button>
              </div>
              
              {quickAddForm.isNewCustomer ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="First name *"
                      value={quickAddForm.customerFirstName}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, customerFirstName: e.target.value })}
                    />
                    <Input
                      placeholder="Last name *"
                      value={quickAddForm.customerLastName}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, customerLastName: e.target.value })}
                    />
                  </div>
                  <PhoneInput
                    placeholder="Phone *"
                    value={quickAddForm.customerPhone}
                    onChange={(rawValue, formatted) => {
                      setQuickAddForm({ ...quickAddForm, customerPhone: formatted })
                    }}
                    returnRawValue={false}
                    autoFormat={true}
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={quickAddForm.customerEmail}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, customerEmail: e.target.value })}
                  />
                </div>
              ) : (
                <Select
                  value={quickAddForm.customerId}
                  onValueChange={(value) => setQuickAddForm({ ...quickAddForm, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} - {formatPhoneNumber(customer.phone)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any special instructions..."
                value={quickAddForm.notes}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, notes: e.target.value })}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)} disabled={quickAddLoading}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddSubmit} disabled={quickAddLoading}>
              {quickAddLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Appointment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          open={!!selectedBooking}
          onOpenChange={(open) => {
            if (!open) setSelectedBooking(null)
          }}
          onActionComplete={() => {
            fetchData()
            setSelectedBooking(null)
          }}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-content, .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Portrait orientation, fit on one page */
          @page {
            size: portrait;
            margin: 0.25in;
          }
          /* Compact styles for printing */
          .printable-content .grid > div {
            height: 20px !important;
            min-height: 20px !important;
            padding: 2px !important;
            font-size: 10px !important;
          }
          .printable-content .text-xs {
            font-size: 9px !important;
          }
          .printable-content .p-3 {
            padding: 4px !important;
          }
          .printable-content .p-2 {
            padding: 2px !important;
          }
          /* Hide non-essential elements */
          .printable-content .border-t-2 {
            border-top-width: 1px !important;
          }
          /* Ensure it fits on one page */
          .printable-content {
            transform: scale(0.75);
            transform-origin: top left;
          }
          
          /* Clean appointment blocks for print */
          .print-appointment {
            border: 1px solid #000 !important;
            border-radius: 0 !important;
            padding: 2px !important;
            margin: 1px !important;
            box-shadow: none !important;
            background: white !important;
            overflow: visible !important;
          }
          
          /* Service category colors for print */
          .print-facial {
            background: #fce4ec !important;
            border-left: 3px solid #e91e63 !important;
          }
          .print-massage {
            background: #e3f2fd !important;
            border-left: 3px solid #2196f3 !important;
          }
          .print-body_treatment {
            background: #e8f5e9 !important;
            border-left: 3px solid #4caf50 !important;
          }
          .print-body_scrub {
            background: #f3e5f5 !important;
            border-left: 3px solid #9c27b0 !important;
          }
          .print-waxing {
            background: #fff3e0 !important;
            border-left: 3px solid #ff9800 !important;
          }
          .print-package {
            background: #fffde7 !important;
            border-left: 3px solid #ffeb3b !important;
          }
          
          /* Text styles for print */
          .print-customer-name {
            font-weight: bold !important;
            font-size: 10px !important;
            color: #000 !important;
            white-space: nowrap !important;
            overflow: visible !important;
          }
          
          .print-service-name {
            font-size: 9px !important;
            color: #333 !important;
            white-space: nowrap !important;
            overflow: visible !important;
          }
          
          /* Legend for print */
          .print-legend {
            display: flex !important;
            justify-content: space-around !important;
            margin-bottom: 10px !important;
            padding: 5px !important;
            border: 1px solid #000 !important;
            font-size: 10px !important;
          }
          
          .print-legend-item {
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
          }
          
          .print-legend-color {
            width: 15px !important;
            height: 10px !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  )
}