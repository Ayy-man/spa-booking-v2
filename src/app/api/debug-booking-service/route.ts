import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Get booking ID from query params
    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('bookingId')
    
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }
    
    // Get booking with service details
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        service_id,
        staff_id,
        service:services(
          id,
          name,
          category,
          duration,
          price
        ),
        staff:staff(
          id,
          name,
          capabilities
        )
      `)
      .eq('id', bookingId)
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      bookingId: booking?.id,
      serviceId: booking?.service_id,
      serviceName: (booking?.service as any)?.name,
      serviceCategory: (booking?.service as any)?.category,
      currentStaffId: booking?.staff_id,
      currentStaffName: (booking?.staff as any)?.name,
      currentStaffCapabilities: (booking?.staff as any)?.capabilities,
      serviceCategoryType: typeof (booking?.service as any)?.category,
      rawServiceCategory: JSON.stringify((booking?.service as any)?.category)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}