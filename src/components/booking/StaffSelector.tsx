'use client'

import { Staff, Room, Service } from '@/types/booking'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { canStaffPerformService, getStaffDayAvailability } from '@/lib/booking-logic'
import { format } from 'date-fns'
import { AlertTriangle, Calendar, Clock } from 'lucide-react'

interface StaffSelectorProps {
  staff: (Staff & { default_room?: Room })[]
  selectedStaffId: string | null
  onStaffSelect: (staffId: string) => void
  service: Service | null
  selectedDate?: Date | null
  loading?: boolean
  showAnyOption?: boolean
}

export default function StaffSelector({
  staff,
  selectedStaffId,
  onStaffSelect,
  service,
  selectedDate = null,
  loading = false,
  showAnyOption = true
}: StaffSelectorProps) {
  // Filter staff who can perform the service
  const availableStaff = staff.filter(member => {
    if (!service) return false
    return canStaffPerformService(member, service)
  })
  
  // Further filter by date availability if date is selected
  const staffWithAvailability = availableStaff.map(member => {
    const dayAvailability = selectedDate ? getStaffDayAvailability(member, selectedDate) : null
    return {
      ...member,
      dayAvailability
    }
  })
  
  const fullyAvailableStaff = staffWithAvailability.filter(member => 
    !selectedDate || member.dayAvailability?.isAvailable
  )
  
  const unavailableStaff = staffWithAvailability.filter(member => 
    selectedDate && !member.dayAvailability?.isAvailable
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (availableStaff.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">
              No staff available for {service?.name || 'this service'}
            </div>
            <div className="text-sm">
              {service ? (
                <div>
                  This service requires staff qualified in <strong>{service.category}</strong> treatments.
                  <br />Available categories: {staff.map(s => s.can_perform_services.join(', ')).join(' | ')}
                </div>
              ) : (
                'Please select a service first to see available staff.'
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date-specific availability warning */}
      {selectedDate && fullyAvailableStaff.length < availableStaff.length && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">
                Limited availability on {format(selectedDate, 'EEEE, MMMM d')}
              </div>
              <div className="text-sm">
                {unavailableStaff.length} qualified staff member(s) unavailable on this date.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Any Available Staff Option */}
      {showAnyOption && fullyAvailableStaff.length > 0 && (
        <Card 
          className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedStaffId === 'any' 
              ? 'ring-2 ring-primary border-primary bg-accent/20' 
              : 'hover:border-accent'
          }`}
          onClick={() => onStaffSelect('any')}
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary-dark mb-1">
                Any Available Staff
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                We'll assign the best available staff member for your service
              </p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Recommended
                </Badge>
                {selectedDate && (
                  <Badge variant="outline" className="text-xs">
                    {fullyAvailableStaff.length} available
                  </Badge>
                )}
              </div>
            </div>
            {selectedStaffId === 'any' && (
              <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Available Staff Members */}
      {fullyAvailableStaff.map((member) => (
        <Card 
          key={member.id}
          className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedStaffId === member.id 
              ? 'ring-2 ring-primary border-primary bg-accent/20' 
              : 'hover:border-accent'
          }`}
          onClick={() => onStaffSelect(member.id)}
        >
          <div className="flex items-center space-x-4">
            {/* Staff Photo Placeholder */}
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-gray-600">
                {member.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary-dark mb-1">
                {member.name}
              </h3>
              
              <div className="space-y-1 mb-3">
                {member.default_room && (
                  <p className="text-sm text-gray-600">
                    Default Room: {member.default_room.name}
                  </p>
                )}
                
                {/* Day availability info */}
                {selectedDate && member.dayAvailability && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <Clock className="h-3 w-3" />
                    <span>
                      Available {member.dayAvailability.workStart} - {member.dayAvailability.workEnd}
                    </span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1">
                  {member.can_perform_services.map((serviceType, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className={`text-xs ${
                        service && serviceType === service.category 
                          ? 'border-primary text-primary bg-primary/5' 
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {serviceType.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Staff specialization info */}
              <div className="text-xs text-gray-500">
                {service && canStaffPerformService(member, service) 
                  ? `Qualified for ${service.category.replace('_', ' ')} services`
                  : 'Professional certified staff member'
                }
              </div>
            </div>

            {selectedStaffId === member.id && (
              <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* Unavailable Staff Members (for transparency) */}
      {unavailableStaff.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 border-t pt-4">
            Unavailable on {selectedDate ? format(selectedDate, 'EEEE') : 'selected date'}:
          </div>
          {unavailableStaff.map((member) => (
            <Card key={member.id} className="p-4 opacity-60 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-500">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{member.name}</div>
                  <div className="text-sm text-red-600">
                    {member.dayAvailability?.reasons.join(', ')}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No available staff */}
      {fullyAvailableStaff.length === 0 && selectedDate && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">
                No staff available on {format(selectedDate, 'EEEE, MMMM d')}
              </div>
              <div className="text-sm">
                Please select a different date or contact us for special arrangements.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Note */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          All staff members are certified professionals with expertise in their specialties
        </p>
      </div>
    </div>
  )
}