import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface WaiverSubmission {
  waiverType: string
  serviceName: string
  signature: string
  waiverContent: string
  submittedAt: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    const body: WaiverSubmission = await request.json()

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Waiver API] Incoming submission', {
        waiverType: body.waiverType,
        serviceName: body.serviceName,
        hasSignature: !!body.signature
      })
    }

    // Validate required fields
    if (!body.waiverType || !body.serviceName || !body.signature) {
      return NextResponse.json(
        { error: 'Missing required fields: waiverType, serviceName, and signature are required' },
        { status: 400 }
      )
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Extract customer info from localStorage data (if available)
    // This will be linked to the customer when the booking is completed
    const customerInfo = JSON.parse(body.customerInfo || '{}')

    // Prepare waiver data for database storage
    const waiverData = {
      service_category: body.waiverType,
      service_name: body.serviceName,
      signature: body.signature,
      agreed_to_terms: true,
      waiver_content: JSON.parse(body.waiverContent),
      signed_at: body.submittedAt,
      ip_address: clientIP,
      user_agent: userAgent,
      
      // Extract specific fields based on waiver type
      medical_conditions: body.medical_explanation || null,
      allergies: body.allergies || null,
      skin_conditions: body.skin_conditions || null,
      medications: body.current_medications || null,
      pregnancy_status: body.pregnancy === true || body.pregnancy_disq === true || null,
      previous_waxing: body.previous_waxing || null,
      recent_sun_exposure: body.recent_sun_exposure || null,
      
      // Emergency contact (required for Radio Frequency waivers)
      emergency_contact_name: customerInfo.name || body.name || 'To be provided',
      emergency_contact_phone: customerInfo.phone || body.phone || body.mobile || 'To be provided',
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Waiver API] Prepared waiver payload', {
        service_category: waiverData.service_category,
        service_name: waiverData.service_name,
        signed_at: waiverData.signed_at
      })
    }

    // Save waiver to database
    const { data: waiver, error: waiverError } = await supabase
      .from('waivers')
      .insert(waiverData)
      .select()
      .single()

    if (waiverError) {
      console.error('Waiver database error:', waiverError)
      return NextResponse.json(
        { error: 'Failed to save waiver to database' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      waiverId: waiver.id,
      message: 'Waiver completed and saved successfully'
    })

  } catch (error: any) {
    console.error('Waiver API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const waiverType = url.searchParams.get('type')
    const serviceName = url.searchParams.get('service')

    if (!waiverType || !serviceName) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and service' },
        { status: 400 }
      )
    }

    // Check if a waiver already exists for this service type
    const { data: existingWaiver, error } = await supabase
      .from('waivers')
      .select('id, signed_at, service_name, signature')
      .eq('service_category', waiverType)
      .eq('service_name', serviceName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Waiver lookup error:', error)
      return NextResponse.json(
        { error: 'Failed to check waiver status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: !!existingWaiver,
      waiver: existingWaiver || null
    })

  } catch (error: any) {
    console.error('Waiver GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
