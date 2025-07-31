"use client"

// Debug component to test admin panel data connections
// Add this temporarily to your admin page to debug data issues

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function DebugAdminData() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    debugDataConnections()
  }, [])

  const debugDataConnections = async () => {
    setLoading(true)
    setError('')
    
    try {
      const results: any = {}
      
      // Test 1: Check services
      try {
        const services = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
        results.services = {
          success: !services.error,
          error: services.error?.message,
          count: services.data?.length || 0,
          sample: services.data?.[0]
        }
      } catch (err: any) {
        results.services = { success: false, error: err.message }
      }

      // Test 2: Check staff  
      try {
        const staff = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true)
        results.staff = {
          success: !staff.error,
          error: staff.error?.message,
          count: staff.data?.length || 0,
          sample: staff.data?.[0]
        }
      } catch (err: any) {
        results.staff = { success: false, error: err.message }
      }

      // Test 3: Check rooms
      try {
        const rooms = await supabase
          .from('rooms')
          .select('*')
          .eq('is_active', true)
        results.rooms = {
          success: !rooms.error,
          error: rooms.error?.message,
          count: rooms.data?.length || 0,
          sample: rooms.data?.[0]
        }
      } catch (err: any) {
        results.rooms = { success: false, error: err.message }
      }

      // Test 4: Check customers
      try {
        const customers = await supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
        results.customers = {
          success: !customers.error,
          error: customers.error?.message,
          count: customers.data?.length || 0,
          sample: customers.data?.[0]
        }
      } catch (err: any) {
        results.customers = { success: false, error: err.message }
      }

      // Test 5: Check bookings
      try {
        const bookings = await supabase
          .from('bookings')
          .select('*')
        results.allBookings = {
          success: !bookings.error,
          error: bookings.error?.message,
          count: bookings.data?.length || 0,
          sample: bookings.data?.[0]
        }
      } catch (err: any) {
        results.allBookings = { success: false, error: err.message }
      }

      // Test 6: Check today's bookings specifically
      try {
        const today = new Date().toISOString().split('T')[0]
        const todayBookings = await supabase
          .from('bookings')
          .select(`
            *,
            service:services(*),
            staff:staff(*),
            room:rooms(*)
          `)
          .eq('appointment_date', today)
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true })
        
        results.todayBookings = {
          success: !todayBookings.error,
          error: todayBookings.error?.message,
          count: todayBookings.data?.length || 0,
          sample: todayBookings.data?.[0],
          date: today
        }
      } catch (err: any) {
        results.todayBookings = { success: false, error: err.message }
      }

      // Test 7: Environment variables
      results.environment = {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING'
      }

      setDebugInfo(results)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="font-bold text-yellow-800">🔍 Debugging Admin Data Connections...</h3>
      <p>Checking database connections and data availability...</p>
    </div>
  }

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h3 className="font-bold text-red-800">❌ Debug Error</h3>
      <p className="text-red-700">{error}</p>
    </div>
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-bold text-blue-800 mb-4">🔍 Admin Panel Data Debug Results</h3>
      
      <div className="space-y-4">
        {Object.entries(debugInfo).map(([key, value]: [string, any]) => (
          <div key={key} className="bg-white p-3 rounded border">
            <h4 className="font-semibold text-gray-800 capitalize mb-2">
              {key === 'todayBookings' ? "Today's Bookings" : key}
              {value.success ? ' ✅' : ' ❌'}
            </h4>
            
            {value.error && (
              <p className="text-red-600 text-sm mb-2">Error: {value.error}</p>
            )}
            
            <div className="text-sm text-gray-600">
              <p><strong>Count:</strong> {value.count ?? 'N/A'}</p>
              {value.date && <p><strong>Date:</strong> {value.date}</p>}
              {value.supabaseUrl && <p><strong>Supabase URL:</strong> {value.supabaseUrl}</p>}
              
              {value.sample && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Sample Data</summary>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(value.sample, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded">
        <h4 className="font-semibold mb-2">🔧 Troubleshooting Steps:</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Run the setup SQL script to ensure you have basic data</li>
          <li>Check your Supabase environment variables</li>
          <li>Verify Row Level Security (RLS) policies allow reading</li>
          <li>Check the Supabase logs for any errors</li>
          <li>Ensure your service categories match the enum values</li>
        </ol>
      </div>

      <button 
        onClick={debugDataConnections}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Re-run Debug Check
      </button>
    </div>
  )
}