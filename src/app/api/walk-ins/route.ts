import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'
import { getGuamTime, getGuamDateString, getGuamTimeString, getGuamStartOfDay, getGuamEndOfDay } from '@/lib/timezone-utils'

interface WalkInRequest {
  name: string
  phone: string
  email?: string
  service: string  // This is the service ID
  notes?: string
  marketingConsent?: boolean
  // Couples booking fields
  isCouplesBooking?: boolean
  secondPersonName?: string
  secondService?: string
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

    // Validate couples booking fields if applicable
    if (body.isCouplesBooking) {
      if (!body.secondPersonName || !body.secondService) {
        return NextResponse.json(
          { error: 'Second person name and service are required for couples booking' },
          { status: 400 }
        )
      }
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

    // Get second service details if couples booking
    let secondService: Service | null = null
    if (body.isCouplesBooking && body.secondService) {
      const { data: secondSvc, error: secondServiceError } = await supabase
        .from('services')
        .select('id, name, duration, price, category')
        .eq('id', body.secondService)
        .single()

      if (secondServiceError || !secondSvc) {
        return NextResponse.json(
          { error: 'Invalid second service selection' },
          { status: 400 }
        )
      }
      secondService = secondSvc
    }

    // Generate a couples booking ID if this is a couples booking
    const couplesBookingId = body.isCouplesBooking ? 
      `couples_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null

    // Create first walk-in entry
    const walkInNotes = body.isCouplesBooking ? 
      `[COUPLES BOOKING] ${body.notes || ''}`.trim() : 
      body.notes || null

    const { data: walkIn, error: walkInError } = await supabase
      .from('walk_ins')
      .insert({
        customer_name: body.name,
        customer_phone: body.phone,
        customer_email: body.email || null,
        service_name: service.name,
        service_category: service.category,
        notes: walkInNotes,
        status: 'waiting',
        scheduling_type: 'walk_in',
        checked_in_at: getGuamTime().toISOString(),
        couples_booking_id: couplesBookingId,
        is_couples_booking: body.isCouplesBooking || false
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

    // Create second walk-in entry for couples booking
    let secondWalkIn = null
    if (body.isCouplesBooking && secondService) {
      const secondWalkInNotes = `[COUPLES BOOKING - Linked with ${body.name}]`
      
      const { data: secondEntry, error: secondWalkInError } = await supabase
        .from('walk_ins')
        .insert({
          customer_name: body.secondPersonName!,
          customer_phone: body.phone, // Use primary phone for both
          customer_email: null,
          service_name: secondService.name,
          service_category: secondService.category,
          notes: secondWalkInNotes,
          status: 'waiting',
          scheduling_type: 'walk_in',
          checked_in_at: getGuamTime().toISOString(),
          couples_booking_id: couplesBookingId,
          is_couples_booking: true
        })
        .select()
        .single()

      if (secondWalkInError) {
        console.error('Second walk-in database error:', secondWalkInError)
        // Consider rolling back the first entry here if needed
        return NextResponse.json(
          { error: 'Failed to create second walk-in entry for couples booking' },
          { status: 500 }
        )
      }
      
      secondWalkIn = secondEntry
    }

    // Send GHL webhook for walk-in notification
    try {
      const currentDate = getGuamDateString()
      const currentTime = getGuamTimeString(getGuamTime())

      // Send webhook for first customer
      await ghlWebhookSender.sendWalkInWebhook(
        walkIn.id,
        {
          name: body.name,
          email: body.email || '',
          phone: body.phone,
          isNewCustomer: true,
          marketingConsent: body.marketingConsent || false
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
          staff: body.isCouplesBooking ? 'TBD (Couples Booking)' : 'TBD',
          staffId: '',
          room: body.isCouplesBooking ? 'Couples Room (Room 2 or 3)' : 'TBD',
          roomId: ''
        },
        true // isImmediate = true for walk-ins
      )

      // Send webhook for second customer if couples booking
      if (body.isCouplesBooking && secondWalkIn && secondService) {
        await ghlWebhookSender.sendWalkInWebhook(
          secondWalkIn.id,
          {
            name: body.secondPersonName!,
            email: '',
            phone: body.phone,
            isNewCustomer: true,
            marketingConsent: false
          },
          {
            service: secondService.name,
            serviceId: secondService.id,
            serviceCategory: secondService.category,
            ghlCategory: secondService.category,
            date: currentDate,
            time: currentTime,
            duration: secondService.duration,
            price: secondService.price,
            staff: 'TBD (Couples Booking)',
            staffId: '',
            room: 'Couples Room (Room 2 or 3)',
            roomId: ''
          },
          true
        )
      }
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
        created_at: walkIn.created_at,
        isCouplesBooking: body.isCouplesBooking || false,
        secondPerson: body.isCouplesBooking && secondWalkIn ? {
          id: secondWalkIn.id,
          name: secondWalkIn.customer_name,
          phone: secondWalkIn.customer_phone,
          service: secondWalkIn.service_name,
          price: secondService?.price || 0
        } : undefined,
        totalPrice: body.isCouplesBooking ? 
          (service.price + (secondService?.price || 0)) : 
          service.price
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
      const startOfDay = getGuamStartOfDay(date)
      const endOfDay = getGuamEndOfDay(date)
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
    updateData.updated_at = getGuamTime().toISOString()

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