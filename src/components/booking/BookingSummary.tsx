'use client'

import { useEffect, useState } from 'react'
import { EditIcon, CalendarIcon, ClockIcon, UserIcon, DollarSignIcon } from 'lucide-react'
import { staffNameMap } from '@/lib/staff-data'
import { validateServiceSelection, validateDateTimeSelection, validateStaffSelection } from '@/lib/booking-step-validation'

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

interface BookingSummaryProps {
  className?: string
  showEditLinks?: boolean
  compact?: boolean
}

export function BookingSummary({ 
  className = '', 
  showEditLinks = true,
  compact = false 
}: BookingSummaryProps) {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [customerInfo, setCustomerInfo] = useState<any>(null)

  useEffect(() => {
    // Load all booking data from localStorage
    const loadBookingData = () => {
      const bookingDataStr = localStorage.getItem('bookingData')
      const serviceDataStr = localStorage.getItem('selectedService')
      
      if (bookingDataStr) {
        setBookingData(JSON.parse(bookingDataStr))
      } else if (serviceDataStr) {
        // Fallback for backward compatibility
        const service = JSON.parse(serviceDataStr)
        setBookingData({
          isCouplesBooking: false,
          primaryService: service,
          totalPrice: service.price,
          totalDuration: service.duration
        })
      }
      
      const dateData = localStorage.getItem('selectedDate')
      const timeData = localStorage.getItem('selectedTime')
      const staffData = localStorage.getItem('selectedStaff')
      const customerData = localStorage.getItem('customerInfo')
      
      if (dateData) setSelectedDate(dateData)
      if (timeData) setSelectedTime(timeData)
      if (staffData) setSelectedStaff(staffData)
      if (customerData) setCustomerInfo(JSON.parse(customerData))
    }

    loadBookingData()
    
    // Listen for storage changes to update in real-time
    const handleStorageChange = () => loadBookingData()
    window.addEventListener('storage', handleStorageChange)
    
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStaffName = (staffId: string) => {
    if (staffId === 'any') return 'Any Available Staff'
    return staffNameMap[staffId as keyof typeof staffNameMap] || 'Staff Member'
  }

  const formatTimeRange = (startTime: string, duration: number) => {
    if (!startTime || !duration) return startTime
    
    // Parse start time
    const [hours, minutes] = startTime.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes, 0, 0)
    
    // Calculate end time
    const end = new Date(start.getTime() + duration * 60000)
    
    // Format both times
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      })
    }
    
    return `${formatTime(start)} to ${formatTime(end)}`
  }

  const handleEdit = (section: string) => {
    if (!showEditLinks) return
    
    switch (section) {
      case 'service':
        window.location.href = '/booking'
        break
      case 'datetime':
        // Only allow date/time edit if service is selected
        const serviceValidation = validateServiceSelection()
        if (serviceValidation.isValid) {
          window.location.href = '/booking/date-time'
        } else {
          console.log('[BookingSummary] Cannot edit date/time: no service selected')
          window.location.href = '/booking'
        }
        break
      case 'staff':
        // Only allow staff edit if date/time is selected
        const dateTimeValidation = validateDateTimeSelection()
        if (dateTimeValidation.isValid) {
          const bookingDataStr = localStorage.getItem('bookingData')
          if (bookingDataStr) {
            const parsed = JSON.parse(bookingDataStr)
            window.location.href = parsed.isCouplesBooking ? '/booking/staff-couples' : '/booking/staff'
          } else {
            window.location.href = '/booking/staff'
          }
        } else if (dateTimeValidation.redirectTo) {
          console.log('[BookingSummary] Cannot edit staff: prerequisites not met')
          window.location.href = dateTimeValidation.redirectTo
        }
        break
      case 'customer':
        // Only allow customer edit if staff is selected
        const staffValidation = validateStaffSelection()
        if (staffValidation.isValid) {
          window.location.href = '/booking/customer-info'
        } else if (staffValidation.redirectTo) {
          console.log('[BookingSummary] Cannot edit customer info: prerequisites not met')
          window.location.href = staffValidation.redirectTo
        }
        break
    }
  }

  if (!bookingData && !selectedDate && !selectedTime && !selectedStaff) {
    return null // Don't render if no data
  }

  const containerClasses = compact 
    ? "bg-white rounded-xl border border-primary/10 p-4 shadow-md"
    : "card"

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-heading font-semibold text-primary">
          Booking Summary
        </h3>
        {showEditLinks && (
          <span className="text-sm text-gray-500">
            Click to edit
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Service Information */}
        {bookingData && (
          <div 
            className={`flex items-start justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 ${
              showEditLinks ? 'cursor-pointer hover:bg-primary/10 transition-colors' : ''
            }`}
            onClick={() => handleEdit('service')}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <DollarSignIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {bookingData.isCouplesBooking ? 'Couples Booking' : 'Service'}
                </div>
                {bookingData.isCouplesBooking ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Person 1: {bookingData.primaryService.name}</div>
                    <div>Person 2: {bookingData.secondaryService?.name}</div>
                    <div className="font-medium text-primary">
                      ${bookingData.totalPrice} • {bookingData.totalDuration} minutes
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <div>{bookingData.primaryService.name}</div>
                    <div className="font-medium text-primary">
                      ${bookingData.primaryService.price} • {bookingData.primaryService.duration} minutes
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showEditLinks && (
              <EditIcon className="w-4 h-4 text-gray-400 hover:text-primary transition-colors flex-shrink-0" />
            )}
          </div>
        )}

        {/* Date & Time Information */}
        {(selectedDate || selectedTime) && (
          <div 
            className={`flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 ${
              showEditLinks ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
            }`}
            onClick={() => handleEdit('datetime')}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Date & Time</div>
                <div className="text-sm text-gray-600">
                  {selectedDate && <div>{formatDate(selectedDate)}</div>}
                  {selectedTime && (
                    <div className="flex items-center space-x-1 mt-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>
                        {bookingData ? 
                          formatTimeRange(selectedTime, bookingData.primaryService.duration) : 
                          selectedTime
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {showEditLinks && (
              <div title={!validateServiceSelection().isValid ? 'Please select a service first' : 'Edit date & time'}>
                <EditIcon 
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    validateServiceSelection().isValid
                      ? 'text-gray-400 hover:text-primary cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* Staff Information */}
        {selectedStaff && (
          <div 
            className={`flex items-start justify-between p-4 bg-green-50 rounded-xl border border-green-100 ${
              showEditLinks ? 'cursor-pointer hover:bg-green-100 transition-colors' : ''
            }`}
            onClick={() => handleEdit('staff')}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <UserIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Staff Member</div>
                <div className="text-sm text-gray-600">
                  {getStaffName(selectedStaff)}
                </div>
              </div>
            </div>
            {showEditLinks && (
              <div title={!validateDateTimeSelection().isValid ? 'Please complete previous steps first' : 'Edit staff'}>
                <EditIcon 
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    validateDateTimeSelection().isValid
                      ? 'text-gray-400 hover:text-primary cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* Customer Information */}
        {customerInfo && (
          <div 
            className={`flex items-start justify-between p-4 bg-purple-50 rounded-xl border border-purple-100 ${
              showEditLinks ? 'cursor-pointer hover:bg-purple-100 transition-colors' : ''
            }`}
            onClick={() => handleEdit('customer')}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <UserIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Customer</div>
                <div className="text-sm text-gray-600">
                  <div>{customerInfo.name}</div>
                  <div>{customerInfo.email}</div>
                  {customerInfo.phone && <div>{customerInfo.phone}</div>}
                </div>
              </div>
            </div>
            {showEditLinks && (
              <div title={!validateStaffSelection().isValid ? 'Please complete previous steps first' : 'Edit customer info'}>
                <EditIcon 
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    validateStaffSelection().isValid
                      ? 'text-gray-400 hover:text-primary cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total Price Display */}
      {bookingData && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-primary">
              ${bookingData.totalPrice}
            </span>
          </div>
          {bookingData.isCouplesBooking && (
            <div className="text-sm text-gray-500 text-right mt-1">
              for 2 people
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BookingSummary