// Emergency booking fallback - creates bookings directly without using stored procedures
import { supabase } from './supabase'

export async function emergencyCouplesBooking(params: {
  primaryService: any
  secondaryService: any
  primaryStaff: string
  secondaryStaff: string
  customerInfo: any
  selectedDate: string
  selectedTime: string
  specialRequests?: string
}) {
  const {
    primaryService,
    secondaryService,
    primaryStaff,
    secondaryStaff,
    customerInfo,
    selectedDate,
    selectedTime,
    specialRequests
  } = params

  try {
    // Generate a booking group ID
    const bookingGroupId = crypto.randomUUID()
    
    // Find or create customer
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerInfo.email)
      .single()
    
    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: customerInfo.name.split(' ')[0],
          last_name: customerInfo.name.split(' ').slice(1).join(' ') || '',
          email: customerInfo.email,
          phone: customerInfo.phone,
          is_active: true
        })
        .select('id')
        .single()
      
      if (customerError || !newCustomer) {
        throw new Error('Failed to create customer')
      }
      customerId = newCustomer.id
    }
    
    // Calculate end times
    const startTime = selectedTime
    const primaryEndTime = calculateEndTime(startTime, primaryService.duration)
    const secondaryEndTime = calculateEndTime(startTime, secondaryService.duration)
    
    // Calculate buffer times (15 minutes before start and after end)
    const bufferMinutes = 15
    const bufferStart = calculateEndTime(startTime, -bufferMinutes)
    const primaryBufferEnd = calculateEndTime(primaryEndTime, bufferMinutes)
    const secondaryBufferEnd = calculateEndTime(secondaryEndTime, bufferMinutes)
    
    // Ensure buffer times stay within business hours (9 AM - 8 PM)
    const clampBufferTime = (time: string): string => {
      const [hours, minutes] = time.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes
      
      // Clamp between 9:00 (540 minutes) and 20:00 (1200 minutes)
      const clampedMinutes = Math.max(540, Math.min(1200, totalMinutes))
      const clampedHours = Math.floor(clampedMinutes / 60)
      const clampedMins = clampedMinutes % 60
      
      return `${clampedHours.toString().padStart(2, '0')}:${clampedMins.toString().padStart(2, '0')}`
    }
    
    const finalBufferStart = clampBufferTime(bufferStart)
    const finalPrimaryBufferEnd = clampBufferTime(primaryBufferEnd)
    const finalSecondaryBufferEnd = clampBufferTime(secondaryBufferEnd)
    
    // Find available room
    let roomId = await findAvailableRoom(selectedDate, startTime, Math.max(primaryService.duration, secondaryService.duration))
    
    if (!roomId) {
      throw new Error('No rooms available at the selected time')
    }
    
    // Create bookings array
    const bookings = [
      {
        id: crypto.randomUUID(),
        customer_id: customerId,
        service_id: primaryService.id,
        staff_id: primaryStaff,
        room_id: roomId,
        appointment_date: selectedDate,
        start_time: startTime,
        end_time: primaryEndTime,
        duration: primaryService.duration,
        buffer_start: finalBufferStart,
        buffer_end: finalPrimaryBufferEnd,
        total_price: primaryService.price,
        discount: 0,
        final_price: primaryService.price,
        status: 'confirmed',
        payment_status: 'pending',
        payment_option: 'deposit',
        notes: specialRequests,
        booking_type: 'couple',
        booking_group_id: bookingGroupId
      },
      {
        id: crypto.randomUUID(),
        customer_id: customerId,
        service_id: secondaryService.id,
        staff_id: secondaryStaff || primaryStaff,
        room_id: roomId, // SAME ROOM
        appointment_date: selectedDate,
        start_time: startTime,
        end_time: secondaryEndTime,
        duration: secondaryService.duration,
        buffer_start: finalBufferStart,
        buffer_end: finalSecondaryBufferEnd,
        total_price: secondaryService.price,
        discount: 0,
        final_price: secondaryService.price,
        status: 'confirmed',
        payment_status: 'pending',
        payment_option: 'deposit',
        notes: specialRequests,
        booking_type: 'couple',
        booking_group_id: bookingGroupId // SAME GROUP
      }
    ]
    
    // Insert BOTH bookings in a single transaction
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookings)
      .select()
    
    if (error) {
      console.error('Emergency booking error:', error)
      
      // If it's a unique constraint error, try with a different approach
      if (error.message.includes('unique') || error.message.includes('already booked')) {
        // Try inserting them one at a time with a delay
        const results = []
        for (const booking of bookings) {
          const { data: singleData, error: singleError } = await supabase
            .from('bookings')
            .insert(booking)
            .select()
            .single()
          
          if (singleError) {
            console.error('Single booking failed:', singleError)
            // Clean up if second booking fails
            if (results.length > 0) {
              await supabase
                .from('bookings')
                .delete()
                .eq('id', results[0].id)
            }
            throw singleError
          }
          results.push(singleData)
        }
        return results
      }
      
      throw error
    }
    
    return data
    
  } catch (error) {
    console.error('Emergency couples booking failed:', error)
    throw error
  }
}

function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + duration
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

async function findAvailableRoom(date: string, startTime: string, duration: number): Promise<number | null> {
  const endTime = calculateEndTime(startTime, duration)
  
  // Check each room
  for (const roomId of [2, 3, 1]) { // Prefer rooms 2 and 3 for couples
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
      .limit(1)
    
    if (!conflicts || conflicts.length === 0) {
      return roomId
    }
  }
  
  return null
}