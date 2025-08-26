import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Get staff ID from query params
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    
    if (staffId) {
      // Get specific staff member
      const { data: staff, error } = await supabaseAdmin
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single()
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({
        staff,
        capabilities: staff?.capabilities || [],
        capabilitiesType: Array.isArray(staff?.capabilities) ? 'array' : typeof staff?.capabilities,
        rawCapabilities: JSON.stringify(staff?.capabilities)
      })
    } else {
      // Get all staff
      const { data: allStaff, error } = await supabaseAdmin
        .from('staff')
        .select('id, name, capabilities, service_exclusions')
        .order('name')
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({
        staff: allStaff?.map(s => ({
          id: s.id,
          name: s.name,
          capabilities: s.capabilities,
          capabilitiesType: Array.isArray(s.capabilities) ? 'array' : typeof s.capabilities,
          rawCapabilities: JSON.stringify(s.capabilities),
          service_exclusions: s.service_exclusions
        }))
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}