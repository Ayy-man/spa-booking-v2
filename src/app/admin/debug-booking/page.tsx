'use client'

import { useState } from 'react'

export default function DebugBookingPage() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testBookingConflict = async () => {
    setIsLoading(true)
    setDebugResult(null)

    try {
      const response = await fetch('/api/debug-booking-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'deep_tissue_massage',
          staff_id: 'robyn_camacho',
          appointment_date: '2025-08-07',
          start_time: '15:15'
        })
      })

      const data = await response.json()
      setDebugResult(data)
    } catch (error) {
      setDebugResult({
        success: false,
        error: 'Failed to debug booking conflict',
        details: error
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <a href="/admin" className="hover:text-primary transition-colors">
          Home
        </a>
        <span>/</span>
        <span className="text-gray-900">Debug Booking</span>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Debug Booking Conflict</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Failed Booking</h2>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div><strong>Service:</strong> Deep Tissue Body Massage (60 min)</div>
          <div><strong>Date:</strong> Thursday, August 7, 2025</div>
          <div><strong>Time:</strong> 15:15 to 16:15</div>
          <div><strong>Staff:</strong> robyn_camacho</div>
        </div>
        
        <button
          onClick={testBookingConflict}
          disabled={isLoading}
          className={`px-6 py-2 rounded-lg font-medium ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Debugging...' : 'Debug Booking Conflict'}
        </button>
      </div>

      {debugResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          
          {debugResult.success ? (
            <div className="space-y-6">
              {/* Service Info */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Service Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>ID:</strong> {debugResult.debug_info.service.id}</div>
                    <div><strong>Name:</strong> {debugResult.debug_info.service.name}</div>
                    <div><strong>Duration:</strong> {debugResult.debug_info.service.duration} minutes</div>
                    <div><strong>Category:</strong> {debugResult.debug_info.service.category}</div>
                    <div><strong>Requires Room 3:</strong> {debugResult.debug_info.service.requires_room_3 ? 'Yes' : 'No'}</div>
                    <div><strong>Couples Service:</strong> {debugResult.debug_info.service.is_couples_service ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Booking Assignment</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Assigned Room:</strong> Room {debugResult.debug_info.booking_details.assigned_room_id}</div>
                    <div><strong>Staff Default Room:</strong> Room {debugResult.debug_info.staff_info?.default_room_id || 'Unknown'}</div>
                    <div><strong>Staff Name:</strong> {debugResult.debug_info.staff_info?.name || 'Unknown'}</div>
                    <div><strong>Time Slot:</strong> {debugResult.debug_info.booking_details.start_time} - {debugResult.debug_info.booking_details.end_time}</div>
                  </div>
                </div>
              </div>

              {/* Existing Bookings */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Existing Bookings on {debugResult.debug_info.booking_details.appointment_date}</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {debugResult.debug_info.existing_bookings.length === 0 ? (
                    <p className="text-sm text-gray-600">No existing bookings found for this date.</p>
                  ) : (
                    <div className="space-y-2">
                      {debugResult.debug_info.existing_bookings.map((booking: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 bg-white rounded border">
                          <div>
                            <strong>Room {booking.room_id}</strong> - {booking.start_time} to {booking.end_time}
                          </div>
                          <div className="text-gray-600">
                            Staff: {booking.staff_id} | Service: {booking.service_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conflict Analysis */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Conflict Analysis</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {/* Room Conflicts */}
                  <div>
                    <h4 className="font-medium mb-2">Room Conflicts ({debugResult.debug_info.conflicts.total_room_conflicts})</h4>
                    {debugResult.debug_info.conflicts.room_conflicts.length === 0 ? (
                      <p className="text-sm text-green-600">✅ No room conflicts detected</p>
                    ) : (
                      <div className="space-y-1">
                        {debugResult.debug_info.conflicts.room_conflicts.map((conflict: any, index: number) => (
                          <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                            ❌ Room {conflict.room_id} conflict: {conflict.start_time} - {conflict.end_time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Staff Conflicts */}
                  <div>
                    <h4 className="font-medium mb-2">Staff Conflicts ({debugResult.debug_info.conflicts.total_staff_conflicts})</h4>
                    {debugResult.debug_info.conflicts.staff_conflicts.length === 0 ? (
                      <p className="text-sm text-green-600">✅ No staff conflicts detected</p>
                    ) : (
                      <div className="space-y-1">
                        {debugResult.debug_info.conflicts.staff_conflicts.map((conflict: any, index: number) => (
                          <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                            ❌ Staff {conflict.staff_id} conflict: {conflict.start_time} - {conflict.end_time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Buffer Conflicts */}
                  <div>
                    <h4 className="font-medium mb-2">Buffer Conflicts (15-minute rule) ({debugResult.debug_info.conflicts.total_buffer_conflicts})</h4>
                    {debugResult.debug_info.conflicts.buffer_conflicts.length === 0 ? (
                      <p className="text-sm text-green-600">✅ No buffer violations detected</p>
                    ) : (
                      <div className="space-y-1">
                        {debugResult.debug_info.conflicts.buffer_conflicts.map((conflict: any, index: number) => (
                          <div key={index} className="text-sm text-orange-600 p-2 bg-orange-50 rounded">
                            ⚠️ Buffer violation with booking: {conflict.start_time} - {conflict.end_time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Conflict Source */}
                  <div className="p-4 bg-white rounded border">
                    <h4 className="font-medium mb-2">Primary Conflict Source</h4>
                    <p className="text-lg font-semibold">
                      {debugResult.debug_info.conflict_analysis.primary_conflict_source === 'room' && (
                        <span className="text-red-600">🔴 Room Conflict</span>
                      )}
                      {debugResult.debug_info.conflict_analysis.primary_conflict_source === 'staff' && (
                        <span className="text-red-600">🔴 Staff Conflict</span>
                      )}
                      {debugResult.debug_info.conflict_analysis.primary_conflict_source === 'buffer' && (
                        <span className="text-orange-600">🟡 Buffer Violation</span>
                      )}
                      {debugResult.debug_info.conflict_analysis.primary_conflict_source === 'none' && (
                        <span className="text-green-600">🟢 No Conflicts Detected</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{debugResult.error}</p>
              {debugResult.details && (
                <pre className="mt-2 text-xs text-red-500 overflow-auto">
                  {JSON.stringify(debugResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}