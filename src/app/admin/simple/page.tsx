'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface Booking {
  booking_id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  booking_date: string
  start_time: string
  status: string
  service_name?: string
  staff_name?: string
  room_name?: string
}

export default function SimpleAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      // Get today's bookings
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          booking_id,
          customer_name,
          customer_email,
          customer_phone,
          booking_date,
          start_time,
          status,
          services(name),
          staff(name),
          rooms(name)
        `)
        .eq('booking_date', today)
        .order('start_time')

      if (error) throw error

      const formattedBookings = data?.map(booking => ({
        booking_id: booking.booking_id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        status: booking.status,
        service_name: booking.services?.[0]?.name,
        staff_name: booking.staff?.[0]?.name,
        room_name: booking.rooms?.[0]?.name
      })) || []

      setBookings(formattedBookings)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const markAsShow = async (booking: Booking) => {
    try {
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('booking_id', booking.booking_id)

      if (error) throw error

      // Send webhook to GHL using the proper webhook sender
      const webhookResult = await ghlWebhookSender.sendShowNoShowWebhook(
        booking.booking_id,
        {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        },
        {
          service: booking.service_name || 'Unknown Service',
          serviceCategory: 'spa_treatment', // You might want to get this from the booking
          date: booking.booking_date,
          time: booking.start_time,
          duration: 60, // Default duration, should be from booking data
          price: 0, // Should be from booking data
          staff: booking.staff_name,
          room: booking.room_name
        },
        'show',
        'Marked as show by admin'
      )
      
      if (!webhookResult.success) {
        console.error('Webhook failed:', webhookResult.error)
      }
      
      // Refresh bookings
      loadBookings()
    } catch (err: any) {
      alert('Error marking as show: ' + err.message)
    }
  }

  const markAsNoShow = async (booking: Booking) => {
    try {
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('booking_id', booking.booking_id)

      if (error) throw error

      // Send webhook to GHL using the proper webhook sender
      const webhookResult = await ghlWebhookSender.sendShowNoShowWebhook(
        booking.booking_id,
        {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        },
        {
          service: booking.service_name || 'Unknown Service',
          serviceCategory: 'spa_treatment', // You might want to get this from the booking
          date: booking.booking_date,
          time: booking.start_time,
          duration: 60, // Default duration, should be from booking data
          price: 0, // Should be from booking data
          staff: booking.staff_name,
          room: booking.room_name
        },
        'no_show',
        'Marked as no-show by admin'
      )
      
      if (!webhookResult.success) {
        console.error('Webhook failed:', webhookResult.error)
      }
      
      // Refresh bookings
      loadBookings()
    } catch (err: any) {
      alert('Error marking as no-show: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Panel - Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel - Today&apos;s Appointments</h1>
          <button 
            onClick={loadBookings}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Error: {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Today&apos;s Bookings ({bookings.length})
            </h2>
            
            {bookings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bookings for today</p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{booking.customer_name}</h3>
                        <p className="text-gray-600">{booking.customer_email}</p>
                        {booking.customer_phone && (
                          <p className="text-gray-600">{booking.customer_phone}</p>
                        )}
                        <div className="mt-2 text-sm text-gray-500">
                          <p><strong>Service:</strong> {booking.service_name}</p>
                          <p><strong>Staff:</strong> {booking.staff_name}</p>
                          <p><strong>Room:</strong> {booking.room_name}</p>
                          <p><strong>Time:</strong> {booking.start_time}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'no_show' ? 'bg-red-100 text-red-800' :
                          booking.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {booking.status}
                        </div>
                        
                        {booking.status === 'confirmed' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => markAsShow(booking)}
                              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                            >
                              Mark as Show
                            </button>
                            <button
                              onClick={() => markAsNoShow(booking)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                            >
                              Mark as No-Show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}