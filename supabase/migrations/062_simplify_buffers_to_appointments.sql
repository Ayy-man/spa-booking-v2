-- Simplify buffer system by using separate buffer appointments instead of complex validation
-- This migration removes all buffer-related columns and constraints

-- 1. Drop buffer enforcement trigger and function
DROP TRIGGER IF EXISTS enforce_buffer_constraints_trigger ON bookings;
DROP FUNCTION IF EXISTS check_buffer_conflicts() CASCADE;

-- 2. Remove buffer columns from bookings table
ALTER TABLE bookings 
DROP COLUMN IF EXISTS buffer_start,
DROP COLUMN IF EXISTS buffer_end;

-- 3. Add support for buffer bookings as a special booking type
-- First check if booking_type column exists and what type it is
DO $$ 
BEGIN
    -- Check if booking_type column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_type'
    ) THEN
        -- Check if it's an enum type
        IF EXISTS (
            SELECT 1 
            FROM pg_type 
            WHERE typname = 'booking_type' 
            AND typtype = 'e'
        ) THEN
            -- Add 'buffer' to the enum if not exists
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_enum 
                WHERE enumlabel = 'buffer' 
                AND enumtypid = (
                    SELECT oid 
                    FROM pg_type 
                    WHERE typname = 'booking_type'
                )
            ) THEN
                ALTER TYPE booking_type ADD VALUE IF NOT EXISTS 'buffer';
            END IF;
        ELSE
            -- booking_type exists but is not an enum, update it to support 'buffer'
            -- This assumes it's a text field with a check constraint
            ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;
            ALTER TABLE bookings ADD CONSTRAINT bookings_booking_type_check 
                CHECK (booking_type IN ('single', 'couple', 'group', 'buffer'));
        END IF;
    ELSE
        -- booking_type column doesn't exist, add it as text with check constraint
        ALTER TABLE bookings ADD COLUMN booking_type TEXT DEFAULT 'single';
        ALTER TABLE bookings ADD CONSTRAINT bookings_booking_type_check 
            CHECK (booking_type IN ('single', 'couple', 'group', 'buffer'));
    END IF;
END $$;

-- 4. Create a special service for buffer/prep time (optional - can use null service_id instead)
-- Using 'treatments' category which exists in the database
DO $$
BEGIN
    INSERT INTO services (
        name,
        category,
        price,
        duration,
        description,
        is_active,
        requires_room_3,
        created_at,
        updated_at
    ) VALUES (
        'Buffer Time',
        'treatments', -- Using treatments category which exists in database
        0, -- No charge
        15, -- 15 minutes
        'Preparation and cleanup time between appointments',
        false, -- Not visible to customers
        false,
        NOW(),
        NOW()
    ) ON CONFLICT (name) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- If insert fails (e.g., category doesn't exist), continue without error
        -- The buffer system will work with NULL service_id
        NULL;
END $$;

-- 5. Function to automatically create buffer appointments after main bookings
CREATE OR REPLACE FUNCTION create_buffer_appointment()
RETURNS TRIGGER AS $$
DECLARE
    buffer_service_id UUID;
    buffer_end_time TIME;
    booking_type_value TEXT;
BEGIN
    -- Check if booking_type column exists and get its value
    BEGIN
        booking_type_value := NEW.booking_type;
    EXCEPTION
        WHEN undefined_column THEN
            booking_type_value := 'single'; -- Default if column doesn't exist
    END;
    
    -- Only create buffers for regular bookings, not for buffers themselves or cancelled bookings
    IF booking_type_value = 'buffer' OR NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Get the buffer service ID
    SELECT id INTO buffer_service_id 
    FROM services 
    WHERE name = 'Buffer Time' 
    LIMIT 1;

    -- Calculate buffer end time (15 minutes after main appointment)
    buffer_end_time := (NEW.end_time::time + INTERVAL '15 minutes')::time;
    
    -- Don't create buffer if it would exceed business hours
    IF buffer_end_time > '20:00:00'::time THEN
        RETURN NEW;
    END IF;

    -- Create the buffer appointment
    -- Build dynamic INSERT based on whether booking_type column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_type'
    ) THEN
        INSERT INTO bookings (
            customer_id,
            service_id,
            staff_id,
            room_id,
            appointment_date,
            start_time,
            end_time,
            duration,
            total_price,
            final_price,
            status,
            payment_status,
            booking_type,
            notes,
            created_at,
            updated_at
        ) VALUES (
            NEW.customer_id,
            buffer_service_id, -- Can be NULL if service doesn't exist
            NEW.staff_id,
            NEW.room_id,
            NEW.appointment_date,
            NEW.end_time,
            buffer_end_time,
            15, -- 15 minutes
            0, -- Free
            0, -- Free
            'confirmed', -- Auto-confirmed
            'paid', -- No payment needed
            'buffer', -- Mark as buffer type
            'Auto-generated buffer time for appointment ' || NEW.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING; -- Prevent duplicate buffers
    ELSE
        -- Insert without booking_type column
        INSERT INTO bookings (
            customer_id,
            service_id,
            staff_id,
            room_id,
            appointment_date,
            start_time,
            end_time,
            duration,
            total_price,
            final_price,
            status,
            payment_status,
            notes,
            created_at,
            updated_at
        ) VALUES (
            NEW.customer_id,
            buffer_service_id, -- Can be NULL if service doesn't exist
            NEW.staff_id,
            NEW.room_id,
            NEW.appointment_date,
            NEW.end_time,
            buffer_end_time,
            15, -- 15 minutes
            0, -- Free
            0, -- Free
            'confirmed', -- Auto-confirmed
            'paid', -- No payment needed
            'Auto-generated buffer time for appointment ' || NEW.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING; -- Prevent duplicate buffers
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-create buffer appointments
CREATE TRIGGER auto_create_buffer_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_buffer_appointment();

-- 7. Clean up any existing buffer time references in comments
COMMENT ON TABLE bookings IS 'Bookings table with automatic buffer appointment generation. Buffer appointments are separate bookings with type="buffer"';

-- 8. Create index for faster buffer booking queries (only if booking_type column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
    END IF;
END $$;

-- 9. Drop the old buffer-related indexes
DROP INDEX IF EXISTS idx_bookings_buffer_times;