'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircleIcon, AlertCircleIcon, ArrowLeftIcon, SearchIcon } from 'lucide-react'
import { ButtonLoading } from '@/components/ui/loading-spinner'

const appointmentCheckinSchema = z.object({
  searchTerm: z.string()
    .min(2, 'Please enter at least 2 characters')
    .max(100, 'Search term too long'),
  confirmationCode: z.string()
    .optional()
})

export type AppointmentCheckinData = z.infer<typeof appointmentCheckinSchema>

interface AppointmentCheckinFormProps {
  onSubmit: (data: AppointmentCheckinData) => void
  onBack: () => void
  loading?: boolean
  error?: string | null
  foundAppointments?: any[]
}

export function AppointmentCheckinForm({ 
  onSubmit, 
  onBack, 
  loading = false, 
  error = null,
  foundAppointments = []
}: AppointmentCheckinFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<AppointmentCheckinData>({
    resolver: zodResolver(appointmentCheckinSchema),
    defaultValues: {
      searchTerm: '',
      confirmationCode: ''
    },
    mode: 'onChange'
  })

  const formData = watch()

  const handleFormSubmit = async (data: AppointmentCheckinData) => {
    await onSubmit(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Appointment Check-In
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Let&apos;s find your appointment
        </p>
        <p className="text-gray-500">
          Please provide your information to locate your scheduled appointment
        </p>
      </div>

      <Card className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Search Term */}
          <div className="space-y-2">
            <Label htmlFor="searchTerm" className="text-sm font-medium text-gray-700">
              Name, Phone Number, or Email *
            </Label>
            <div className="relative">
              <Input
                id="searchTerm"
                type="text"
                placeholder="Enter your name, phone, or email"
                className="pl-10"
                {...register('searchTerm')}
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {errors.searchTerm && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircleIcon className="w-4 h-4" />
                {errors.searchTerm.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              We&apos;ll search for today&apos;s appointments matching this information
            </p>
          </div>

          {/* Confirmation Code (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="confirmationCode" className="text-sm font-medium text-gray-700">
              Confirmation Code <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="confirmationCode"
              type="text"
              placeholder="Enter your confirmation code if you have it"
              {...register('confirmationCode')}
            />
            <p className="text-xs text-gray-500">
              This helps us find your appointment faster, but it&apos;s not required
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Found Appointments Display */}
          {foundAppointments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Found Appointments for Today:</h3>
              {foundAppointments.map((appointment, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-900">
                        {appointment.service_name || appointment.service?.name}
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <div>Time: {appointment.start_time} - {appointment.end_time}</div>
                        <div>Staff: {appointment.staff?.name || appointment.staff_name}</div>
                        <div>Room: {appointment.room?.name || appointment.room_name}</div>
                        {appointment.status && (
                          <div>Status: <span className="capitalize">{appointment.status}</span></div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => {
                        // This would trigger the check-in process for this specific appointment
                        onSubmit({ 
                          searchTerm: formData.searchTerm, 
                          confirmationCode: appointment.id 
                        })
                      }}
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Check In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Button */}
          <Button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-green-600 text-white hover:bg-green-700"
            size="lg"
          >
            {loading ? (
              <ButtonLoading text="Searching..." />
            ) : (
              <>
                <SearchIcon className="w-5 h-5 mr-2" />
                Find My Appointment
              </>
            )}
          </Button>

          {/* Back Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full"
            disabled={loading}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
        </form>
      </Card>

      {/* Help Text */}
      <div className="text-center">
        <div className="bg-blue-50 rounded-lg p-4 max-w-2xl mx-auto">
          <h4 className="font-medium text-blue-900 mb-2">Can&apos;t Find Your Appointment?</h4>
          <p className="text-sm text-blue-800">
            If you&apos;re having trouble locating your appointment, please speak with our 
            front desk staff. They can help verify your booking details and assist with check-in.
          </p>
        </div>
      </div>
    </div>
  )
}