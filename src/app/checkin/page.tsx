'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import WalkInForm, { WalkInFormData } from '@/components/walk-in/WalkInForm'
import { CheckInFlowSelector } from '@/components/checkin/checkin-flow-selector'
import { AppointmentCheckinForm, AppointmentCheckinData } from '@/components/checkin/appointment-checkin-form'
import { CheckCircleIcon, ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

interface WalkInResponse {
  success: boolean
  walkIn?: {
    id: string
    name: string
    phone: string
    email: string | null
    service: string
    notes: string | null
    status: string
    created_at: string
    isCouplesBooking?: boolean
    secondPerson?: {
      id: string
      name: string
      phone: string
      service: string
      price: number
    }
    totalPrice?: number
  }
  error?: string
}

interface AppointmentResponse {
  success: boolean
  message: string
  appointment?: {
    id: string
    service_name: string
    start_time: string
    end_time: string
    staff_name: string
    room_name: string
    status: string
    checked_in_at: string
  }
  appointments?: Array<{
    id: string
    service_name: string
    start_time: string
    end_time: string
    staff_name: string
    room_name: string
    customer_name: string
    status: string
    checked_in_at: string | null
  }>
  error?: string
}

type FlowType = 'selector' | 'appointment' | 'walkin'
type CompletionType = 'appointment' | 'walkin'

export default function CheckinPage() {
  const [currentFlow, setCurrentFlow] = useState<FlowType>('selector')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [completionType, setCompletionType] = useState<CompletionType>('walkin')
  const [submittedWalkInData, setSubmittedWalkInData] = useState<WalkInResponse['walkIn'] | null>(null)
  const [submittedAppointmentData, setSubmittedAppointmentData] = useState<AppointmentResponse['appointment'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [foundAppointments, setFoundAppointments] = useState<AppointmentResponse['appointments']>([])
  const [appointmentError, setAppointmentError] = useState<string | null>(null)

  const handleWalkInSubmit = async (data: WalkInFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/walk-ins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: WalkInResponse = await response.json()

      if (result.success && result.walkIn) {
        setSubmittedWalkInData(result.walkIn)
        setCompletionType('walkin')
        setSubmitted(true)
      } else {
        setError(result.error || 'Failed to submit walk-in request')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Walk-in submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAppointmentSubmit = async (data: AppointmentCheckinData) => {
    setLoading(true)
    setAppointmentError(null)
    setFoundAppointments([])

    try {
      const response = await fetch('/api/appointments/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: data.searchTerm,
          confirmationCode: data.confirmationCode,
          appointmentId: data.confirmationCode // If this is actually an appointment ID for direct check-in
        }),
      })

      const result: AppointmentResponse = await response.json()

      if (result.success && result.appointment) {
        // Direct check-in successful
        setSubmittedAppointmentData(result.appointment)
        setCompletionType('appointment')
        setSubmitted(true)
      } else if (result.success && result.appointments && result.appointments.length > 0) {
        // Found appointments for selection
        setFoundAppointments(result.appointments)
      } else {
        setAppointmentError(result.message || result.error || 'No appointments found')
      }
    } catch (err) {
      setAppointmentError('Network error. Please try again.')
      console.error('Appointment check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartOver = () => {
    setCurrentFlow('selector')
    setSubmitted(false)
    setSubmittedWalkInData(null)
    setSubmittedAppointmentData(null)
    setError(null)
    setAppointmentError(null)
    setFoundAppointments([])
  }

  const handleClearSearch = () => {
    setFoundAppointments([])
    setAppointmentError(null)
  }

  // Success screen for both appointment check-in and walk-in
  if (submitted) {
    const isAppointmentCompletion = completionType === 'appointment'
    const data = isAppointmentCompletion ? submittedAppointmentData : submittedWalkInData

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className={`w-16 h-16 ${isAppointmentCompletion ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <CheckCircleIcon className={`w-8 h-8 ${isAppointmentCompletion ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isAppointmentCompletion ? 'Appointment Check-In Complete!' : 
                 submittedWalkInData?.isCouplesBooking ? 'Couples Walk-In Check-In Complete!' : 
                 'Walk-In Check-In Complete!'}
              </h1>
              <p className="text-gray-600">
                {isAppointmentCompletion 
                  ? 'Welcome! You have been successfully checked in for your appointment.'
                  : submittedWalkInData?.isCouplesBooking 
                    ? 'Thank you both for visiting Dermal Skin Clinic. Your couples booking has been recorded.'
                    : 'Thank you for visiting Dermal Skin Clinic. Your information has been recorded.'
                }
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">
                {isAppointmentCompletion ? 'Appointment Details:' : 'Check-In Details:'}
              </h3>
              <div className="space-y-2 text-sm">
                {isAppointmentCompletion && submittedAppointmentData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{submittedAppointmentData.service_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{submittedAppointmentData.start_time} - {submittedAppointmentData.end_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Staff:</span>
                      <span className="font-medium">{submittedAppointmentData.staff_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room:</span>
                      <span className="font-medium">{submittedAppointmentData.room_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Checked In
                      </span>
                    </div>
                  </>
                ) : submittedWalkInData ? (
                  <>
                    {/* First Person Details */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{submittedWalkInData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{submittedWalkInData.phone}</span>
                    </div>
                    {submittedWalkInData.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{submittedWalkInData.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{submittedWalkInData.service}</span>
                    </div>
                    
                    {/* Second Person Details for Couples Booking */}
                    {submittedWalkInData.isCouplesBooking && submittedWalkInData.secondPerson && (
                      <>
                        <div className="border-t pt-2 mt-2">
                          <div className="text-sm font-semibold text-[#C36678] mb-2">Second Person</div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{submittedWalkInData.secondPerson.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{submittedWalkInData.secondPerson.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service:</span>
                          <span className="font-medium">{submittedWalkInData.secondPerson.service}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Total Price for Couples */}
                    {submittedWalkInData.isCouplesBooking && submittedWalkInData.totalPrice && (
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-semibold">Total Price:</span>
                          <span className="font-bold text-lg text-[#C36678]">${submittedWalkInData.totalPrice}</span>
                        </div>
                      </div>
                    )}
                    
                    {submittedWalkInData.notes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Notes:</span>
                        <span className="font-medium">{submittedWalkInData.notes}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Waiting
                      </span>
                    </div>
                    
                    {/* Couples Booking Indicator */}
                    {submittedWalkInData.isCouplesBooking && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C36678]/10 text-[#C36678] border border-[#C36678]/20">
                          Couples Booking - Room 2 or 3
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className={`${isAppointmentCompletion ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
              <h4 className={`font-medium ${isAppointmentCompletion ? 'text-green-900' : 'text-blue-900'} mb-2`}>
                What&apos;s Next?
              </h4>
              <p className={`text-sm ${isAppointmentCompletion ? 'text-green-700' : 'text-blue-700'}`}>
                {isAppointmentCompletion 
                  ? 'Please have a seat in our waiting area. Our staff will call you when it\'s time for your appointment.'
                  : 'Our staff will review your request and accommodate you as soon as possible. Please have a seat in our waiting area and we\'ll call you shortly.'
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleStartOver}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Check In Another Person
              </Button>
              <Link href="/">
                <Button className="btn-primary">
                  Back to Website
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Flow Selector */}
        {currentFlow === 'selector' && (
          <CheckInFlowSelector
            onSelectFlow={(flow) => setCurrentFlow(flow)}
          />
        )}

        {/* Appointment Check-In Flow */}
        {currentFlow === 'appointment' && (
          <AppointmentCheckinForm
            onSubmit={handleAppointmentSubmit}
            onBack={() => setCurrentFlow('selector')}
            onClearSearch={handleClearSearch}
            loading={loading}
            error={appointmentError}
            foundAppointments={foundAppointments}
          />
        )}

        {/* Walk-In Flow */}
        {currentFlow === 'walkin' && (
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Walk-In Service Request
              </h1>
              <p className="text-lg text-gray-600 mb-2">
                Welcome to Dermal Skin Clinic
              </p>
              <p className="text-gray-500">
                Please fill out the form below and we&apos;ll accommodate you as soon as possible.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <Card className="mb-6 p-4 bg-red-50 border-red-200">
                <p className="text-red-600 text-center">{error}</p>
              </Card>
            )}

            {/* Walk-In Form */}
            <WalkInForm 
              onSubmit={handleWalkInSubmit} 
              loading={loading} 
            />

            {/* Back Button */}
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setCurrentFlow('selector')}
                className="flex items-center gap-2 mx-auto"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Options
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-2">
                Need to make a reservation instead?
              </p>
              <Link href="/booking">
                <Button variant="outline" className="text-gray-600">
                  Book an Appointment Online
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}