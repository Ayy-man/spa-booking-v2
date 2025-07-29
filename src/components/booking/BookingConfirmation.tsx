'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Service, Staff, Room } from '@/types/booking'

interface BookingData {
  service: Service
  staff: Staff | null
  room: Room | null
  customer_name: string
  customer_email: string
  customer_phone?: string
  booking_date: string
  start_time: string
  end_time: string
  special_requests?: string
}

interface BookingConfirmationProps {
  bookingData: BookingData
  onConfirm: () => Promise<void>
  onEdit: () => void
  loading?: boolean
}

export default function BookingConfirmation({ 
  bookingData, 
  onConfirm, 
  onEdit, 
  loading = false 
}: BookingConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, 'EEEE, MMMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      return format(date, 'h:mm a')
    } catch {
      return timeStr
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Service Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          Service Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-gray-900">{bookingData.service.name}</h4>
              <p className="text-sm text-gray-600">
                Duration: {bookingData.service.duration} minutes
              </p>
              {bookingData.service.category && (
                <p className="text-xs text-gray-500 capitalize">
                  Category: {bookingData.service.category.replace('_', ' ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold text-primary">
                ${bookingData.service.price}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Appointment Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          Appointment Details
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Date</h4>
            <p className="text-gray-900 font-medium">
              {formatDate(bookingData.booking_date)}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Time</h4>
            <p className="text-gray-900 font-medium">
              {formatTime(bookingData.start_time)} - {formatTime(bookingData.end_time)}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Staff Member</h4>
            <p className="text-gray-900 font-medium">
              {bookingData.staff?.name || 'Any Available Staff'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Room</h4>
            <p className="text-gray-900 font-medium">
              {bookingData.room?.name || 'Will be assigned'}
            </p>
          </div>
        </div>
      </Card>

      {/* Customer Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          Customer Information
        </h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Name</h4>
            <p className="text-gray-900">{bookingData.customer_name}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">Email</h4>
            <p className="text-gray-900">{bookingData.customer_email}</p>
          </div>
          {bookingData.customer_phone && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Phone</h4>
              <p className="text-gray-900">{bookingData.customer_phone}</p>
            </div>
          )}
          {bookingData.special_requests && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Special Requests</h4>
              <p className="text-gray-900 whitespace-pre-wrap">
                {bookingData.special_requests}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Important Information */}
      <Card className="p-6 bg-accent/10 border-accent">
        <h3 className="text-lg font-semibold text-primary-dark mb-3">
          Important Information
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Please arrive 10 minutes before your appointment</p>
          <p>• Cancellations must be made at least 24 hours in advance</p>
          <p>• A confirmation email will be sent to your email address</p>
          <p>• Please bring a valid ID and any relevant medical information</p>
          <p>• If you have any skin conditions or allergies, please inform your practitioner</p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={onEdit}
          variant="outline"
          className="flex-1 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={isConfirming || loading}
        >
          Edit Booking Details
        </Button>
        
        <Button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-black text-white hover:bg-gray-900"
          disabled={isConfirming || loading}
        >
          {isConfirming || loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Confirming Booking...
            </div>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>

      {/* Payment Information */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-primary-dark mb-3">
          Payment Information
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Payment will be collected at the time of service</p>
          <p>• We accept cash, credit cards, and debit cards</p>
          <p>• Gratuity is appreciated but not required</p>
          <div className="mt-4 p-3 bg-white rounded border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total Amount:</span>
              <span className="text-xl font-semibold text-primary">
                ${bookingData.service.price}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}