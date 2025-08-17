-- Emergency script to clear blocking bookings
-- BE CAREFUL - This will delete bookings

-- First, show what would be deleted
SELECT 
    'Bookings that would be cleared:' as action,
    b.id,
    b.appointment_date,
    b.start_time,
    b.end_time,
    b.room_id,
    c.email as customer_email,
    b.notes,
    b.created_at
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.appointment_date = '2025-08-22'
AND b.status != 'cancelled'
AND b.room_id IN (2, 3)
AND (
    -- Only target test bookings
    c.email LIKE '%test%' 
    OR b.notes LIKE '%test%' 
    OR b.notes LIKE '%Test%'
    OR b.booking_group_id IN (
        SELECT DISTINCT booking_group_id 
        FROM bookings 
        WHERE notes LIKE '%test%' AND booking_group_id IS NOT NULL
    )
)
ORDER BY b.created_at DESC;

-- To actually delete test bookings, uncomment and run this:
/*
DELETE FROM bookings
WHERE appointment_date = '2025-08-22'
AND status != 'cancelled'
AND room_id IN (2, 3)
AND id IN (
    SELECT b.id
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.appointment_date = '2025-08-22'
    AND (
        c.email LIKE '%test%' 
        OR b.notes LIKE '%test%' 
        OR b.notes LIKE '%Test%'
    )
);
*/

-- Alternative: Cancel instead of delete (safer)
/*
UPDATE bookings
SET status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Test booking cleanup'
WHERE appointment_date = '2025-08-22'
AND status != 'cancelled'
AND room_id IN (2, 3)
AND id IN (
    SELECT b.id
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.appointment_date = '2025-08-22'
    AND (
        c.email LIKE '%test%' 
        OR b.notes LIKE '%test%' 
        OR b.notes LIKE '%Test%'
    )
);
*/

-- After cleanup, verify rooms are available
WITH time_check AS (
    SELECT 
        '2025-08-22'::DATE as check_date,
        '10:15'::TIME as start_time,
        '11:15'::TIME as end_time
)
SELECT 
    'Room availability after cleanup:' as status,
    r.id as room_id,
    r.name as room_name,
    NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = r.id
        AND b.appointment_date = tc.check_date
        AND b.status != 'cancelled'
        AND (b.start_time < tc.end_time AND b.end_time > tc.start_time)
    ) as is_available
FROM rooms r
CROSS JOIN time_check tc
WHERE r.id IN (2, 3);