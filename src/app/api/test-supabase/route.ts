import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test what tables exist
    const tables = ['services', 'staff', 'rooms', 'bookings', 'customers', 'staff_schedules']
    const tableTests: any = {}
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      tableTests[table] = {
        exists: !error,
        error: error?.message,
        hasData: data && data.length > 0,
        recordCount: data?.length || 0
      }
    }

    // Test RPC functions
    const rpcFunctions = ['get_available_time_slots', 'assign_optimal_room', 'check_staff_capability']
    const rpcTests: any = {}
    
    for (const func of rpcFunctions) {
      try {
        const { error } = await supabase.rpc(func, {})
        rpcTests[func] = !error
      } catch (e) {
        rpcTests[func] = false
      }
    }

    return NextResponse.json({
      success: true,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tables: tableTests,
      rpcFunctions: rpcTests
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 })
  }
}