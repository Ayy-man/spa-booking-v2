import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

interface WalkInRequest {
  name: string
  phone: string
  email?: string
  service: string
  notes?: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  category: string
}

export async function POST(request: NextRequest) {
  try {
    const body: WalkInRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.phone || !body.service) {
      return NextResponse.json(
        { error: 'Name, phone, and service are required' },
        { status: 400 }
      )
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration, price, category')
      .eq('id', body.service)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Invalid service selection' },
        { status: 400 }
      )
    }

    // Create walk-in entry in database
    const { data: walkIn, error: walkInError } = await supabase
      .from('walk_ins')
      .insert({
        customer_name: body.name,
        customer_phone: body.phone,
        customer_email: body.email || null,
        service_name: service.name,
        service_category: service.category,
        notes: body.notes || null,
        status: 'waiting',
        scheduling_type: 'walk_in',
        checked_in_at: new Date().toISOString()
      })
      .select()
      .single()

    if (walkInError) {
      console.error('Walk-in database error:', walkInError)
      return NextResponse.json(
        { error: 'Failed to create walk-in entry' },
        { status: 500 }
      )
    }

    // Send GHL webhook for walk-in notification
    try {
      const currentDate = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5)

      await ghlWebhookSender.sendWalkInWebhook(
        walkIn.id,
        {
          name: body.name,
          email: body.email || '',
          phone: body.phone,
          isNewCustomer: true
        },
        {
          service: service.name,
          serviceId: service.id,
          serviceCategory: service.category,
          ghlCategory: service.category,
          date: currentDate,
          time: currentTime,
          duration: service.duration,
          price: service.price,
          staff: 'TBD',
          staffId: '',
          room: 'TBD',
          roomId: ''
        },
        true // isImmediate = true for walk-ins
      )
    } catch (webhookError) {
      console.error('Walk-in webhook failed:', webhookError)
      // Don't fail the request if webhook fails
    }

    return NextResponse.json({
      success: true,
      walkIn: {
        id: walkIn.id,
        name: walkIn.customer_name,
        phone: walkIn.customer_phone,
        email: walkIn.customer_email,
        service: walkIn.service_name,
        notes: walkIn.notes,
        status: walkIn.status,
        created_at: walkIn.created_at
      }
    })

  } catch (error) {
    console.error('Walk-in API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    let query = supabase
      .from('walk_ins')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by date if provided (for today's walk-ins)
    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`
      const endOfDay = `${date}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: walkIns, error } = await query

    if (error) {
      console.error('Walk-ins fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch walk-ins' },
        { status: 500 }
      )
    }

    return NextResponse.json({ walkIns: walkIns || [] })

  } catch (error) {
    console.error('Walk-ins GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Walk-in ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    updateData.updated_at = new Date().toISOString()

    const { data: walkIn, error } = await supabase
      .from('walk_ins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Walk-in update error:', error)
      return NextResponse.json(
        { error: 'Failed to update walk-in' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      walkIn
    })

  } catch (error) {
    console.error('Walk-in PATCH API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}