import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { ghlWebhookSender } from '@/lib/ghl-webhook-sender'

// Create admin client for operations that need to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CheckInRequest {
  searchTerm: string
  confirmationCode?: string
  appointmentId?: string // For when a specific appointment is selected
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequest = await request.json()
    console.log('Check-in request received:', { 
      searchTerm: body.searchTerm,
      confirmationCode: body.confirmationCode,
      hasSearchTerm: !!body.searchTerm, 
      hasAppointmentId: !!body.appointmentId,
      appointmentId: body.appointmentId 
    })

    if (!body.searchTerm && !body.appointmentId) {
      return NextResponse.json(
        { error: 'Search term or appointment ID is required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    console.log('Processing check-in for date:', today)

    // If appointmentId is provided, check in that specific appointment
    if (body.appointmentId) {
      try {
      console.log('Attempting to check in appointment ID:', body.appointmentId)
      console.log('Today\'s date:', today)

      // First, verify the appointment exists and get its details
      const { data: appointments, error: appointmentError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          staff:staff(*),
          room:rooms(*),
          customer:customers(*)
        `)
        .eq('id', body.appointmentId)
        .eq('appointment_date', today)

      console.log('Appointment search result:', { 
        appointmentsCount: appointments?.length || 0,
        appointmentError,
        searchCriteria: { id: body.appointmentId, date: today }
      })

      if (appointmentError) {
        console.error('Appointment search error:', appointmentError)
        return NextResponse.json(
          { error: `Failed to find appointment: ${appointmentError.message}` },
          { status: 500 }
        )
      }

      if (!appointments || appointments.length === 0) {
        // Try without date constraint to see if appointment exists at all
        console.log('No appointments found for today, trying without date constraint...')
        const { data: anyDateAppointments, error: anyDateError } = await supabase
          .from('bookings')
          .select('id, appointment_date, status')
          .eq('id', body.appointmentId)

        console.log('Appointment check without date:', { 
          found: anyDateAppointments?.length || 0,
          appointments: anyDateAppointments,
          error: anyDateError 
        })

        if (anyDateAppointments && anyDateAppointments.length > 0) {
          const apt = anyDateAppointments[0]
          return NextResponse.json(
            { error: `Appointment found but scheduled for ${apt.appointment_date}, not today (${today})` },
            { status: 404 }
          )
        }

        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      if (appointments.length > 1) {
        console.error('Multiple appointments found with same ID:', appointments.length)
        return NextResponse.json(
          { error: 'Multiple appointments found with same ID' },
          { status: 500 }
        )
      }

      const appointment = appointments[0]

      // Check if already checked in
      if (appointment.checked_in_at) {
        return NextResponse.json(
          { error: 'Appointment already checked in' },
          { status: 400 }
        )
      }

      // Update appointment status to show customer has arrived
      console.log('Current appointment status:', appointment.status)
      console.log('Updating appointment with ID:', body.appointmentId)
      
      // Use admin client to bypass RLS policies for the update operation
      const { data: updatedAppointments, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
          // Using service role key bypasses RLS policies that were blocking updates
        })
        .eq('id', body.appointmentId)
        .select()

      console.log('Update result:', { updatedAppointments, updateError })

      if (updateError) {
        console.error('Update error:', updateError)
        console.error('Attempted to update booking ID:', body.appointmentId)
        return NextResponse.json(
          { error: `Failed to check in appointment: ${updateError.message}` },
          { status: 500 }
        )
      }

      if (!updatedAppointments || updatedAppointments.length === 0) {
        console.error('No rows updated during check-in')
        return NextResponse.json(
          { error: 'Failed to update appointment status' },
          { status: 500 }
        )
      }

      const updatedAppointment = updatedAppointments[0]

      // Send "show" webhook to GHL
      try {
        if (appointment.customer && appointment.service && appointment.staff && appointment.room) {
          await ghlWebhookSender.sendShowNoShowWebhook(
            appointment.id,
            {
              name: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
              email: appointment.customer.email || '',
              phone: appointment.customer.phone,
              isNewCustomer: false
            },
            {
              service: appointment.service.name,
              serviceId: appointment.service.id,
              serviceCategory: appointment.service.category,
              ghlCategory: appointment.service.ghl_category,
              date: appointment.appointment_date,
              time: appointment.start_time,
              duration: appointment.service.duration,
              price: appointment.service.price,
              staff: appointment.staff.name,
              staffId: appointment.staff.id,
              room: `Room ${appointment.room.name}`,
              roomId: String(appointment.room.id)
            },
            'show', // Customer showed up
            'Customer checked in via self-service'
          )
        } else {
          console.error('Missing required data for webhook:', {
            hasCustomer: !!appointment.customer,
            hasService: !!appointment.service,
            hasStaff: !!appointment.staff,
            hasRoom: !!appointment.room
          })
        }
      } catch (webhookError) {
        console.error('Check-in webhook failed:', webhookError)
        // Don't fail the check-in if webhook fails
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully checked in',
        appointment: {
          id: updatedAppointment.id,
          service_name: appointment.service.name,
          start_time: updatedAppointment.start_time,
          end_time: updatedAppointment.end_time,
          staff_name: appointment.staff.name,
          room_name: appointment.room.name,
          status: updatedAppointment.status,
          checked_in_at: updatedAppointment.checked_in_at
        }
      })
      } catch (appointmentError: any) {
        console.error('Error in appointment check-in section:', appointmentError)
        return NextResponse.json(
          { error: `Appointment check-in failed: ${appointmentError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    // Search for appointments - first get all today's bookings with customer data
    const { data: appointments, error: searchError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        staff:staff(*),
        room:rooms(*),
        customer:customers(*)
      `)
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })

    if (searchError) {
      console.error('Appointment fetch error:', searchError)
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      )
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No appointments scheduled for today',
        appointments: []
      })
    }

    // Filter appointments based on search term
    const searchTerm = body.searchTerm.toLowerCase().trim()
    console.log('Search term:', searchTerm)
    console.log('Total appointments found for today:', appointments.length)
    
    let filteredAppointments = appointments

    if (searchTerm) {
      filteredAppointments = appointments.filter(apt => {
        const customer = apt.customer
        if (!customer) {
          console.log('No customer data for appointment:', apt.id)
          return false
        }

        console.log('Checking appointment:', {
          id: apt.id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          searchTerm: searchTerm
        })

        let matchFound = false
        let matchReason = ''

        // Search by name (improved matching logic)
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase().trim()
        if (fullName) {
          // Split search term into words for better matching
          const searchWords = searchTerm.split(' ').filter(word => word.length > 0)
          const nameWords = fullName.split(' ').filter(word => word.length > 0)
          
          // Check if any name word starts with any search word (more precise matching)
          const hasNameMatch = searchWords.some(searchWord => 
            nameWords.some(nameWord => {
              // Exact match or starts with search term
              if (nameWord === searchWord || nameWord.startsWith(searchWord)) {
                return true
              }
              // For longer search terms (4+ chars), allow contains match
              // But avoid short ambiguous terms like "man"
              if (searchWord.length >= 4 && nameWord.includes(searchWord)) {
                return true  
              }
              return false
            })
          )
          
          if (hasNameMatch) {
            matchFound = true
            matchReason = 'name'
            console.log('Match found by name:', fullName, 'matches search terms:', searchWords)
          }
        }

        // Search by email (improved matching logic)
        if (!matchFound && customer.email) {
          const email = customer.email.toLowerCase()
          // For emails, check if it starts with search term or contains it as a whole word
          if (email.startsWith(searchTerm) || 
              (searchTerm.length >= 3 && email.includes(searchTerm)) ||
              searchTerm.includes('@') && email === searchTerm) {
            matchFound = true
            matchReason = 'email'
            console.log('Match found by email:', email, 'matches', searchTerm)
          }
        }

        // Search by phone (improved matching logic)
        if (!matchFound && customer.phone && searchTerm.replace(/[\D]/g, '').length >= 3) {
          const cleanSearchPhone = searchTerm.replace(/[\D]/g, '')
          const cleanCustomerPhone = customer.phone.replace(/[\D]/g, '')
          
          // For phone numbers, match if the customer phone ends with search digits (more specific)
          // or contains the search digits for longer search terms
          if (cleanSearchPhone && (
              cleanCustomerPhone.endsWith(cleanSearchPhone) ||
              (cleanSearchPhone.length >= 4 && cleanCustomerPhone.includes(cleanSearchPhone))
            )) {
            matchFound = true
            matchReason = 'phone'
            console.log('Match found by phone:', customer.phone, 'matches digits', cleanSearchPhone)
          }
        }

        // Search by confirmation code (booking ID) - only if confirmation code is provided
        if (!matchFound && body.confirmationCode) {
          const confirmationCode = body.confirmationCode.trim()
          if (confirmationCode && apt.id === confirmationCode) {
            matchFound = true
            matchReason = 'confirmation_code'
            console.log('Match found by confirmation code:', apt.id)
          }
        }

        if (!matchFound) {
          console.log('No match found for appointment:', apt.id)
        } else {
          console.log(`Match found for appointment ${apt.id} by ${matchReason}`)
        }

        return matchFound
      })
      
      console.log('Filtered appointments count:', filteredAppointments.length)
      if (filteredAppointments.length > 0) {
        console.log('Filtered appointments details:', filteredAppointments.map(apt => ({
          id: apt.id,
          customerName: `${apt.customer.first_name} ${apt.customer.last_name}`,
          customerEmail: apt.customer.email,
          customerPhone: apt.customer.phone
        })))
      }
    } else {
      console.log('No search term provided, returning all appointments')
    }

    if (!filteredAppointments || filteredAppointments.length === 0) {
      console.log(`No matches found for search term: "${searchTerm}"`)
      return NextResponse.json({
        success: false,
        message: `No appointments found for today matching "${body.searchTerm}"`,
        appointments: []
      })
    }

    // Return found appointments for selection
    const formattedAppointments = filteredAppointments.map(apt => ({
      id: apt.id,
      service_name: apt.service.name,
      start_time: apt.start_time,
      end_time: apt.end_time,
      staff_name: apt.staff.name,
      room_name: apt.room.name,
      customer_name: `${apt.customer.first_name} ${apt.customer.last_name}`,
      status: apt.status,
      checked_in_at: apt.checked_in_at
    }))

    console.log('Returning formatted appointments:', formattedAppointments)

    return NextResponse.json({
      success: true,
      message: `Found ${filteredAppointments.length} appointment${filteredAppointments.length > 1 ? 's' : ''} for today`,
      appointments: formattedAppointments
    })

  } catch (error: any) {
    console.error('Appointment check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}