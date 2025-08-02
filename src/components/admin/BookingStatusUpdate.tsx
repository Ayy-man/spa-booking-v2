'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircleIcon, AlertCircleIcon, ClockIcon, XCircleIcon } from 'lucide-react'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGHLServiceCategory } from '@/lib/staff-data'

interface BookingStatusUpdateProps {
  booking: {
    id: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    service_name: string
    appointment_date: string
    start_time: string
    duration: number
    price: number
    staff_name?: string
    room_name?: string
    status: string
  }
  onStatusUpdate: (bookingId: string, newStatus: string) => void
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon, color: 'text-blue-600' },
  { value: 'completed', label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600' },
  { value: 'no_show', label: 'No Show', icon: XCircleIcon, color: 'text-red-600' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600' },
  { value: 'rescheduled', label: 'Rescheduled', icon: ClockIcon, color: 'text-orange-600' }
]

export default function BookingStatusUpdate({ booking, onStatusUpdate }: BookingStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState(booking.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastWebhookResult, setLastWebhookResult] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === booking.status) return

    setIsUpdating(true)
    setLastWebhookResult(null)

    try {
      // Update the booking status in database (this would be handled by the parent component)
      onStatusUpdate(booking.id, newStatus)
      
      // Send conditional webhook based on the new status
      const webhookResult = await ghlWebhookSender.sendConditionalStatusWebhook(
        {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone || ''
        },
        {
          service: booking.service_name,
          serviceCategory: getServiceCategoryFromName(booking.service_name),
          ghlCategory: getGHLServiceCategory(booking.service_name),
          date: booking.appointment_date,
          time: booking.start_time,
          duration: booking.duration,
          price: booking.price,
          staff: booking.staff_name,
          room: booking.room_name
        },
        newStatus
      )

      if (webhookResult.success) {
        switch (newStatus) {
          case 'no_show':
            setLastWebhookResult('✅ Rebooking SMS sent to customer')
            break
          case 'completed':
            setLastWebhookResult('✅ Post-care sequence triggered')
            break
          case 'rescheduled':
            setLastWebhookResult('✅ Status updated (no automation)')
            break
          default:
            setLastWebhookResult('✅ Status update webhook sent')
        }
      } else {
        setLastWebhookResult(`❌ Webhook failed: ${webhookResult.error}`)
      }

      setSelectedStatus(newStatus)
    } catch (error) {
      console.error('Error updating booking status:', error)
      setLastWebhookResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper function to get service category from service name
  const getServiceCategoryFromName = (serviceName: string): string => {
    const name = serviceName.toLowerCase()
    
    if (name.includes('facial')) return 'facial'
    if (name.includes('massage')) return 'massage'
    if (name.includes('scrub') || name.includes('treatment')) return 'body_treatment'
    if (name.includes('wax')) return 'waxing'
    if (name.includes('package')) return 'package'
    
    return 'facial' // default
  }

  const getCurrentStatusOption = () => {
    return STATUS_OPTIONS.find(option => option.value === selectedStatus) || STATUS_OPTIONS[0]
  }

  return (
    <Card className="p-4 border-l-4 border-l-blue-500">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Update Booking Status
          </h3>
          <div className="flex items-center gap-2">
            {React.createElement(getCurrentStatusOption().icon, {
              className: `w-5 h-5 ${getCurrentStatusOption().color}`
            })}
            <span className={`text-sm font-medium ${getCurrentStatusOption().color}`}>
              {getCurrentStatusOption().label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = selectedStatus === option.value
            const isCurrentStatus = booking.status === option.value
            
            return (
              <Button
                key={option.value}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                disabled={isUpdating || isCurrentStatus}
                onClick={() => handleStatusUpdate(option.value)}
                className={`
                  flex items-center gap-2 justify-start h-auto py-2 px-3
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  ${isCurrentStatus ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Icon className={`w-4 h-4 ${option.color}`} />
                <span className="text-sm">{option.label}</span>
                {isCurrentStatus && (
                  <span className="text-xs text-gray-500">(current)</span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Automation Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Automation Triggers:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>No Show:</strong> Sends rebooking SMS to customer</li>
            <li>• <strong>Completed:</strong> Triggers post-care follow-up sequence</li>
            <li>• <strong>Rescheduled:</strong> No automation (prevents duplicate messages)</li>
            <li>• <strong>Other statuses:</strong> Standard status update webhook</li>
          </ul>
        </div>

        {/* Webhook Result */}
        {lastWebhookResult && (
          <div className={`
            p-3 rounded-lg text-sm
            ${lastWebhookResult.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
            }
          `}>
            {lastWebhookResult}
          </div>
        )}

        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Updating status and sending automation...</span>
          </div>
        )}
      </div>
    </Card>
  )
}