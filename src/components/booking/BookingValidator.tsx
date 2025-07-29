'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  validateBookingRequest,
  getOptimalRoom,
  validateStaffCapability,
  getStaffDayAvailability,
  formatErrorMessage
} from '@/lib/booking-logic'
import { Service, Staff, Room, Booking } from '@/types/booking'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'

interface BookingValidatorProps {
  service: Service | null
  staff: Staff | null
  room: Room | null
  date: Date | null
  time: string | null
  existingBookings?: Booking[]
  onValidationChange?: (isValid: boolean, errors: string[], warnings: string[]) => void
}

export default function BookingValidator({
  service,
  staff,
  room,
  date,
  time,
  existingBookings = [],
  onValidationChange
}: BookingValidatorProps) {
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    conflicts: any[]
  } | null>(null)
  
  const [roomAssignment, setRoomAssignment] = useState<{
    room: Room | null
    reason: string
    errors: string[]
  } | null>(null)
  
  const [staffValidation, setStaffValidation] = useState<{
    canPerform: boolean
    reasons: string[]
  } | null>(null)
  
  const [staffAvailability, setStaffAvailability] = useState<{
    isAvailable: boolean
    reasons: string[]
    dayName: string
  } | null>(null)

  useEffect(() => {
    if (service && staff && room && date && time) {
      performValidation()
    } else {
      setValidation(null)
      setRoomAssignment(null)
      setStaffValidation(null)
      setStaffAvailability(null)
    }
  }, [service, staff, room, date, time, existingBookings])

  const performValidation = () => {
    if (!service || !staff || !room || !date || !time) return

    // Validate complete booking request
    const bookingValidation = validateBookingRequest(
      service,
      staff,
      room,
      date,
      time,
      existingBookings
    )
    setValidation(bookingValidation)

    // Get optimal room assignment
    const roomAssignmentResult = getOptimalRoom(service, staff, [room], date, time)
    setRoomAssignment(roomAssignmentResult)

    // Validate staff capability
    const staffCapabilityResult = validateStaffCapability(staff, service)
    setStaffValidation(staffCapabilityResult)

    // Check staff availability for the day
    const staffAvailabilityResult = getStaffDayAvailability(staff, date)
    setStaffAvailability(staffAvailabilityResult)

    // Notify parent component
    if (onValidationChange) {
      onValidationChange(
        bookingValidation.isValid,
        bookingValidation.errors,
        bookingValidation.warnings
      )
    }
  }

  const getBusinessRuleExplanation = (service: Service): string[] => {
    const rules: string[] = []
    
    if (service.requires_body_scrub_room || service.category === 'body_scrub') {
      rules.push('Body scrub services can only be performed in Room 3 (specialized equipment required)')
    }
    
    if (service.requires_couples_room || service.is_package) {
      rules.push('Couples services require Room 2 or Room 3 (Room 1 is single occupancy only)')
      rules.push('Room 3 is preferred for couples services (premium room with body scrub equipment)')
    }
    
    return rules
  }

  const getStaffConstraintExplanation = (staff: Staff): string[] => {
    const constraints: string[] = []
    
    if (staff.name === 'Leonel Sidon') {
      constraints.push('Leonel works Sundays only')
    }
    
    if (staff.name === 'Selma Villaver' || staff.name === 'Tanisha Harris') {
      constraints.push(`${staff.name} is off on Tuesdays and Thursdays`)
    }
    
    if (staff.name === 'Selma Villaver') {
      constraints.push('Selma specializes in facial treatments only')
    }
    
    if (staff.name === 'Tanisha Harris') {
      constraints.push('Tanisha performs facial treatments and waxing services')
      constraints.push('Tanisha requires 2-hour notice for on-call availability')
    }
    
    if (staff.name === 'Robyn Camacho') {
      constraints.push('Robyn can perform all service types (full schedule)')
    }
    
    return constraints
  }

  if (!service || !staff || !room || !date || !time) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Complete your booking selection to see validation results
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall Validation Status */}
      <Card className={validation?.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            {validation?.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm">
                {validation?.isValid ? 'Booking Validation Passed' : 'Booking Validation Failed'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {validation?.isValid 
                  ? 'All business rules and constraints are satisfied'
                  : 'Please address the issues below to proceed'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validation?.errors && validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Booking Issues:</div>
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm">
                  • {formatErrorMessage(error)}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation?.warnings && validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Important Notes:</div>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm">
                  • {warning}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Room Assignment Analysis */}
      {roomAssignment && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Room Assignment Analysis</div>
                <Badge variant={roomAssignment.room && roomAssignment.room.id === room.id ? 'default' : 'destructive'}>
                  {roomAssignment.room && roomAssignment.room.id === room.id ? 'Optimal' : 'Suboptimal'}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                <div>Selected: {room.name}</div>
                <div>Recommended: {roomAssignment.room?.name || 'None available'}</div>
                <div className="mt-2">Reason: {roomAssignment.reason}</div>
              </div>
              
              {roomAssignment.errors.length > 0 && (
                <div className="text-sm text-red-600 space-y-1">
                  {roomAssignment.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Capability Analysis */}
      {staffValidation && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Staff Capability Check</div>
                <Badge variant={staffValidation.canPerform ? 'default' : 'destructive'}>
                  {staffValidation.canPerform ? 'Qualified' : 'Not Qualified'}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                <div>{staff.name} - {service.category} service</div>
                <div className="mt-1">
                  Can perform: {staff.can_perform_services.join(', ')}
                </div>
              </div>
              
              {!staffValidation.canPerform && (
                <div className="text-sm text-red-600 space-y-1">
                  {staffValidation.reasons.map((reason, index) => (
                    <div key={index}>• {reason}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Availability Analysis */}
      {staffAvailability && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Staff Availability - {format(date, 'EEEE')}</div>
                <Badge variant={staffAvailability.isAvailable ? 'default' : 'destructive'}>
                  {staffAvailability.isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                <div>{staff.name} on {staffAvailability.dayName}</div>
              </div>
              
              {!staffAvailability.isAvailable && (
                <div className="text-sm text-red-600 space-y-1">
                  {staffAvailability.reasons.map((reason, index) => (
                    <div key={index}>• {reason}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Rules Explanation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="font-medium text-sm text-blue-900">
              Business Rules for {service.name}
            </div>
            
            <div className="text-sm text-blue-800 space-y-1">
              {getBusinessRuleExplanation(service).map((rule, index) => (
                <div key={index}>• {rule}</div>
              ))}
            </div>
            
            <div className="font-medium text-sm text-blue-900 mt-4">
              Staff Constraints for {staff.name}
            </div>
            
            <div className="text-sm text-blue-800 space-y-1">
              {getStaffConstraintExplanation(staff).map((constraint, index) => (
                <div key={index}>• {constraint}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="font-medium text-sm text-gray-900 mb-3">
            Booking Summary
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <div>Service: {service.name} ({service.duration} minutes)</div>
            <div>Staff: {staff.name}</div>
            <div>Room: {room.name}</div>
            <div>Date: {format(date, 'EEEE, MMMM d, yyyy')}</div>
            <div>Time: {time}</div>
            <div>Price: ${service.price}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}