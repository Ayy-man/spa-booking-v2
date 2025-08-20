'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CouplesBookingIndicator } from '@/components/ui/couples-booking-indicator'
import { formatPhoneNumber } from '@/lib/phone-utils'
// import { auth } from '@/lib/auth'
// import { useRouter } from 'next/navigation'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  // const [authChecked, setAuthChecked] = useState(false)
  // const router = useRouter()

  // const checkAuthAndFetchBookings = useCallback(async () => {
  //   try {
  //     // Verify admin session
  //     const isValidAdmin = await auth.validateAdminSession()
  //     if (!isValidAdmin) {
  //       router.push('/admin/login')
  //       return
  //     }
      
  //     setAuthChecked(true)
  //     await fetchBookings()
  //   } catch (error) {
  //     // Auth check failed, redirect to login
  //     router.push('/admin/login')
  //   }
  // }, [router])

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(*)
        `)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setBookings(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch(paymentStatus) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'partial': return 'bg-orange-100 text-orange-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPaymentInfo = (booking: any) => {
    const paymentOption = booking.payment_option || 'deposit'
    const paymentStatus = booking.payment_status || 'pending'
    
    if (paymentOption === 'pay_on_location') {
      return {
        main: 'Pay on Location',
        sub: `$${booking.final_price} due`,
        color: 'bg-blue-100 text-blue-800'
      }
    } else if (paymentOption === 'full_payment') {
      return {
        main: paymentStatus === 'paid' ? 'Paid in Full' : 'Full Payment',
        sub: `$${booking.final_price}`,
        color: getPaymentStatusColor(paymentStatus)
      }
    } else {
      // deposit
      const depositAmount = 30
      const remaining = booking.final_price - depositAmount
      return {
        main: paymentStatus === 'paid' ? 'Deposit Paid' : 'Deposit',
        sub: remaining > 0 ? `$${remaining} remaining` : `$${depositAmount}`,
        color: getPaymentStatusColor(paymentStatus)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <a href="/admin" className="hover:text-primary transition-colors">
          Home
        </a>
        <span>/</span>
        <span className="text-gray-900">All Bookings</span>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
          <p className="text-gray-600">View and manage all spa bookings</p>
        </div>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No bookings found</p>
          <p className="text-sm text-gray-500">
            Bookings will appear here once customers start making appointments
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                    </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.customer?.first_name} {booking.customer?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customer?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatPhoneNumber(booking.customer?.phone)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-900">{booking.service?.name}</div>
                          <div className="text-sm text-gray-500">{booking.duration} mins</div>
                        </div>
                        <CouplesBookingIndicator 
                          bookingType={booking.booking_type || 'single'} 
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(booking.appointment_date)}</div>
                      <div className="text-sm text-gray-500">{booking.start_time} - {booking.end_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.staff?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.room?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const paymentInfo = formatPaymentInfo(booking)
                        return (
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentInfo.color}`}>
                              {paymentInfo.main}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {paymentInfo.sub}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${booking.final_price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}