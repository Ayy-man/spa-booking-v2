'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
          <p className="text-gray-600">View and manage all spa bookings</p>
        </div>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark 
                   transition-all duration-300 ease-out
                   hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
                   active:translate-y-0 active:shadow-sm
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                   group"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Refreshing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </span>
          )}
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
        <div className="bg-white rounded-lg shadow-lg overflow-hidden 
                      hover:shadow-xl transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Staff
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Room
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                               hover:text-primary transition-colors duration-200">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <tr 
                    key={booking.id} 
                    className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/10 
                             transition-all duration-300 ease-out hover:shadow-sm
                             group cursor-pointer"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-primary-dark
                                       transition-colors duration-200">
                          {booking.customer?.first_name} {booking.customer?.last_name}
                        </div>
                        <div className="text-sm text-gray-500 group-hover:text-gray-700
                                       transition-colors duration-200">
                          {booking.customer?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 group-hover:text-primary-dark
                                     transition-colors duration-200">{booking.service?.name}</div>
                      <div className="text-sm text-gray-500 group-hover:text-gray-700
                                     transition-colors duration-200">{booking.duration} mins</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 group-hover:text-primary-dark
                                     transition-colors duration-200">{formatDate(booking.appointment_date)}</div>
                      <div className="text-sm text-gray-500 group-hover:text-gray-700
                                     transition-colors duration-200">{booking.start_time} - {booking.end_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-900 group-hover:text-primary-dark
                                       transition-colors duration-200">
                          {booking.staff?.name}
                        </div>
                        {booking.staff?.id === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' && (
                          <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full
                                         animate-pulse border border-amber-300">
                            Needs Assignment
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 group-hover:text-primary-dark
                                     transition-colors duration-200">{booking.room?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                       transition-all duration-200 group-hover:scale-105 
                                       ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const paymentInfo = formatPaymentInfo(booking)
                        return (
                          <div>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                           transition-all duration-200 group-hover:scale-105
                                           ${paymentInfo.color}`}>
                              {paymentInfo.main}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 group-hover:text-gray-700
                                           transition-colors duration-200">
                              {paymentInfo.sub}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold
                                   group-hover:text-primary-dark group-hover:scale-105 
                                   transition-all duration-200">
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