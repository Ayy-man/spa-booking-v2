import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NotificationType, NotificationPriority } from '@/types/notifications'

// Test endpoint for creating sample notifications
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test Notifications API',
    usage: 'POST to this endpoint with notification details',
    examplePayload: {
      type: 'new_booking',
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'normal'
    },
    availableTypes: [
      'new_booking',
      'walk_in',
      'payment_received',
      'booking_cancelled',
      'booking_rescheduled',
      'double_booking_attempt',
      'staff_unavailable',
      'room_conflict',
      'system_alert'
    ],
    availablePriorities: ['urgent', 'high', 'normal', 'low']
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { type, title, message, priority = 'normal' } = body
    
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create test notification
    const { data, error } = await supabase.rpc('create_notification', {
      p_type: type as NotificationType,
      p_title: title,
      p_message: message,
      p_priority: priority as NotificationPriority,
      p_metadata: {
        test: true,
        createdAt: new Date().toISOString(),
        ...body.metadata
      },
      p_requires_action: body.requiresAction || false,
      p_action_url: body.actionUrl || null
    })

    if (error) {
      console.error('Error creating test notification:', error)
      return NextResponse.json(
        { error: 'Failed to create notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notificationId: data,
      message: 'Test notification created successfully'
    })
  } catch (error: any) {
    console.error('Test notification error:', error)
    return NextResponse.json(
      { error: 'Failed to create test notification', details: error.message },
      { status: 500 }
    )
  }
}

// Quick test notifications for common scenarios
export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const scenario = searchParams.get('scenario') || 'new_booking'
  
  const scenarios: Record<string, any> = {
    new_booking: {
      type: 'new_booking',
      title: 'New Booking',
      message: 'Sarah Johnson booked Deep Cleansing Facial for Tomorrow at 2:00 PM',
      priority: 'normal',
      metadata: {
        customerName: 'Sarah Johnson',
        serviceName: 'Deep Cleansing Facial',
        bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: '14:00'
      },
      requiresAction: true,
      actionUrl: '/admin#schedule'
    },
    walk_in: {
      type: 'walk_in',
      title: 'Walk-In Customer Arrived',
      message: 'Mike Chen arrived for Swedish Massage - No appointment',
      priority: 'high',
      metadata: {
        customerName: 'Mike Chen',
        serviceName: 'Swedish Massage'
      },
      requiresAction: true,
      actionUrl: '/admin#walkins'
    },
    payment_received: {
      type: 'payment_received',
      title: 'Payment Received',
      message: '$150 payment confirmed for Jenny Lee - Brazilian Wax',
      priority: 'normal',
      metadata: {
        amount: 150,
        customerName: 'Jenny Lee',
        serviceName: 'Brazilian Wax'
      }
    },
    urgent_conflict: {
      type: 'double_booking_attempt',
      title: 'Double Booking Detected!',
      message: 'Room 2 is double-booked for 3:00 PM today',
      priority: 'urgent',
      metadata: {
        roomId: '2',
        conflictTime: '15:00',
        conflictDate: new Date().toISOString().split('T')[0]
      },
      requiresAction: true,
      actionUrl: '/admin#timeline'
    },
    booking_cancelled: {
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: 'Emma Wilson cancelled Hot Stone Massage for Friday',
      priority: 'normal',
      metadata: {
        customerName: 'Emma Wilson',
        serviceName: 'Hot Stone Massage',
        cancellationReason: 'Customer requested'
      }
    }
  }
  
  const scenarioData = scenarios[scenario]
  if (!scenarioData) {
    return NextResponse.json(
      { error: 'Invalid scenario', availableScenarios: Object.keys(scenarios) },
      { status: 400 }
    )
  }
  
  // Create the test notification
  const response = await POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(scenarioData)
  }))
  
  return response
}