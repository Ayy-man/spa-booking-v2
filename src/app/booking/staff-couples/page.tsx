'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

export default function CouplesStaffPage() {
  const [primaryStaff, setPrimaryStaff] = useState<string>('')
  const [secondaryStaff, setSecondaryStaff] = useState<string>('')
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true)
  const [staffMap, setStaffMap] = useState<Record<string, string>>({})

  const getServiceCategory = (serviceName: string): string => {
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
    const bookingDataStr = localStorage.getItem('bookingData')
    const dateData = localStorage.getItem('selectedDate')
    const timeData = localStorage.getItem('selectedTime')

    if (bookingDataStr) {
      const parsedBookingData = JSON.parse(bookingDataStr)
      setBookingData(parsedBookingData)
    }
    
    if (dateData) setSelectedDate(dateData)
    if (timeData) setSelectedTime(timeData)
    
    // Fetch available staff
    if (bookingDataStr && dateData && timeData) {
      fetchAvailableStaff()
    }
  }, [])

  const fetchAvailableStaff = async () => {
    setLoadingStaff(true)
    try {
      const allStaff = await supabaseClient.getStaff()
      const date = new Date(selectedDate)
      const dayOfWeek = date.getDay()
      
      const availableStaffMembers = allStaff.filter(staff => {
        return staff.is_active && staff.work_days.includes(dayOfWeek) && staff.id !== 'any'
      })
      
      // Create staff name map
      const nameMap: Record<string, string> = { 'any': 'Any Available Staff' }
      availableStaffMembers.forEach(staff => {
        nameMap[staff.id] = staff.name
      })
      setStaffMap(nameMap)
      
      setAvailableStaff(availableStaffMembers)
    } catch (error) {
      console.error('Error fetching available staff:', error)
      setAvailableStaff([])
    } finally {
      setLoadingStaff(false)
    }
  }

  const handleContinue = () => {
    if (bookingData?.isCouplesBooking && (!primaryStaff || !secondaryStaff)) {
      alert('Please select staff for both people')
      return
    }
    
    if (!bookingData?.isCouplesBooking && !primaryStaff) {
      alert('Please select a staff member')
      return
    }

    localStorage.setItem('selectedStaff', primaryStaff)
    if (bookingData?.isCouplesBooking) {
      localStorage.setItem('secondaryStaff', secondaryStaff)
    }
    
    window.location.href = '/booking/customer-info'
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

  const StaffCard = ({ member, isSelected, onSelect, label }: {
    member: Staff | { id: string; name: string; capabilities: string[]; specialties?: string; initials?: string }
    isSelected: boolean
    onSelect: (id: string) => void
    label?: string
  }) => (
    <Card 
      className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-accent/20' 
          : 'hover:border-accent'
      }`}
      onClick={() => onSelect(member.id)}
    >
      {label && (
        <div className="text-xs font-medium text-primary mb-2">{label}</div>
      )}
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xl font-semibold text-gray-600">
            {member.id === 'any' ? 'AA' : (member.initials || member.name.split(' ').map(n => n[0]).join(''))}
          </span>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary-dark mb-1">
            {member.id === 'any' ? 'Any Available Staff' : member.name}
          </h3>
          
          {member.specialties && (
            <p className="text-sm text-gray-600 mb-2">
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

        {isSelected && (
          <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/booking/date-time" className="text-primary hover:text-primary-dark transition-colors">
            ← Back to Date & Time
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-primary-dark mt-4 mb-2">
            Select Staff Members
          </h1>
          <p className="text-gray-600">
            {bookingData?.isCouplesBooking 
              ? 'Choose staff members for your couples booking'
              : 'Choose your preferred staff member'}
          </p>
        </div>

        {/* Booking Summary */}
        {bookingData && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-heading text-primary-dark mb-4">
              Booking Summary
            </h2>
            <div className="space-y-2 text-gray-600">
              {bookingData.isCouplesBooking ? (
                <>
                  <div>
                    <span className="font-medium">Person 1:</span> {bookingData.primaryService.name}
                  </div>
                  <div>
                    <span className="font-medium">Person 2:</span> {bookingData.secondaryService?.name || bookingData.primaryService.name}
                  </div>
                  <div><span className="font-medium">Total Price:</span> ${bookingData.totalPrice}</div>
                </>
              ) : (
                <>
                  <div><span className="font-medium">Service:</span> {bookingData.primaryService.name}</div>
                  <div><span className="font-medium">Price:</span> ${bookingData.primaryService.price}</div>
                </>
              )}
              <div><span className="font-medium">Date:</span> {formatDate(selectedDate)}</div>
              <div><span className="font-medium">Time:</span> {selectedTime}</div>
            </div>
          </div>
        )}

        {/* Staff Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-heading text-primary-dark mb-6">
            Available Staff
          </h2>
          
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
                No staff available for this time slot. Please go back and select a different time.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {bookingData?.isCouplesBooking ? (
                <>
                  {/* Person 1 Staff Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-primary-dark mb-3">
                      Staff for Person 1 ({bookingData.primaryService.name})
                    </h3>
                    <div className="space-y-3">
                      <StaffCard
                        member={{
                          id: 'any',
                          name: 'Any Available Staff',
                          capabilities: ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special']
                        }}
                        isSelected={primaryStaff === 'any'}
                        onSelect={setPrimaryStaff}
                      />
                      {availableStaff.map((member) => (
                        <StaffCard
                          key={member.id}
                          member={member}
                          isSelected={primaryStaff === member.id}
                          onSelect={setPrimaryStaff}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Person 2 Staff Selection */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-primary-dark mb-3">
                      Staff for Person 2 ({bookingData.secondaryService?.name || bookingData.primaryService.name})
                    </h3>
                    {primaryStaff && primaryStaff !== 'any' && (
                      <Alert className="mb-3">
                        <AlertDescription>
                          Different staff members will be assigned to ensure personalized attention for both guests.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-3">
                      <StaffCard
                        member={{
                          id: 'any',
                          name: 'Any Available Staff',
                          capabilities: ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special']
                        }}
                        isSelected={secondaryStaff === 'any'}
                        onSelect={setSecondaryStaff}
                        label={primaryStaff === 'any' ? undefined : 'Different from Person 1'}
                      />
                      {availableStaff
                        .filter(member => member.id !== primaryStaff || primaryStaff === 'any')
                        .map((member) => (
                          <StaffCard
                            key={member.id}
                            member={member}
                            isSelected={secondaryStaff === member.id}
                            onSelect={setSecondaryStaff}
                          />
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Single Booking Staff Selection */
                <div className="space-y-4">
                  <StaffCard
                    member={{
                      id: 'any',
                      name: 'Any Available Staff',
                      capabilities: ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special']
                    }}
                    isSelected={primaryStaff === 'any'}
                    onSelect={setPrimaryStaff}
                  />
                  {availableStaff.map((member) => (
                    <StaffCard
                      key={member.id}
                      member={member}
                      isSelected={primaryStaff === member.id}
                      onSelect={setPrimaryStaff}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Continue Button */}
        {((bookingData?.isCouplesBooking && primaryStaff && secondaryStaff) || 
          (!bookingData?.isCouplesBooking && primaryStaff)) && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  {bookingData?.isCouplesBooking ? (
                    <div>
                      <div><span className="font-medium">Person 1:</span> {staffMap[primaryStaff]}</div>
                      <div><span className="font-medium">Person 2:</span> {staffMap[secondaryStaff]}</div>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">Selected:</span> {staffMap[primaryStaff]}
                    </div>
                  )}
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