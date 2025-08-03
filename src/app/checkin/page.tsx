'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import WalkInForm, { WalkInFormData } from '@/components/walk-in/WalkInForm'
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
  }
  error?: string
}

export default function WalkInCheckinPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState<WalkInResponse['walkIn'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: WalkInFormData) => {
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
        setSubmittedData(result.walkIn)
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

  const handleStartOver = () => {
    setSubmitted(false)
    setSubmittedData(null)
    setError(null)
  }

  if (submitted && submittedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Walk-In Check-In Complete!
              </h1>
              <p className="text-gray-600">
                Thank you for visiting Dermal Skin Clinic. Your information has been recorded.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Check-In Details:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{submittedData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{submittedData.phone}</span>
                </div>
                {submittedData.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{submittedData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{submittedData.service}</span>
                </div>
                {submittedData.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Notes:</span>
                    <span className="font-medium">{submittedData.notes}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Waiting
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
              <p className="text-sm text-blue-700">
                Our staff will review your request and accommodate you as soon as possible. 
                Please have a seat in our waiting area and we&apos;ll call you shortly.
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Walk-In Check-In
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
          onSubmit={handleSubmit} 
          loading={loading} 
        />

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
    </div>
  )
}