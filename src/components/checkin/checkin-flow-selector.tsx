'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheckIcon, UserPlusIcon, ClockIcon, PlusCircleIcon } from 'lucide-react'

interface CheckInFlowSelectorProps {
  onSelectFlow: (flow: 'appointment' | 'walkin') => void
}

export function CheckInFlowSelector({ onSelectFlow }: CheckInFlowSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to Dermal Skin Clinic
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          How can we help you today?
        </p>
        <p className="text-gray-500">
          Please select the option that best describes your visit
        </p>
      </div>

      {/* Flow Selection Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Existing Appointment Check-In */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-blue-300 cursor-pointer group">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-green-200 transition-colors">
              <CalendarCheckIcon className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                I Have an Appointment
              </h3>
              <p className="text-gray-600 mb-4">
                I already booked an appointment and I&apos;m here to check in for my scheduled service.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <ClockIcon className="w-4 h-4" />
                  <span className="font-medium">Quick Check-In Process</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  We&apos;ll find your appointment and mark you as arrived
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => onSelectFlow('appointment')}
              className="w-full bg-green-600 text-white hover:bg-green-700"
              size="lg"
            >
              <CalendarCheckIcon className="w-5 h-5 mr-2" />
              Check In for Appointment
            </Button>
          </div>
        </Card>

        {/* Walk-In Service */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-blue-300 cursor-pointer group">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-200 transition-colors">
              <UserPlusIcon className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                I&apos;m a Walk-In
              </h3>
              <p className="text-gray-600 mb-4">
                I don&apos;t have an appointment but would like to see if you can accommodate me today.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <PlusCircleIcon className="w-4 h-4" />
                  <span className="font-medium">Subject to Availability</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  We&apos;ll add you to our walk-in list and accommodate you as soon as possible
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => onSelectFlow('walkin')}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              size="lg"
            >
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Request Walk-In Service
            </Button>
          </div>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="text-center mt-8">
        <div className="bg-gray-50 rounded-lg p-4 max-w-2xl mx-auto">
          <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600">
            If you&apos;re unsure about your appointment status or need assistance, 
            please speak with our front desk staff who will be happy to help you.
          </p>
        </div>
      </div>
    </div>
  )
}