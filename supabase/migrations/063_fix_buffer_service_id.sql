-- Fix buffer appointment creation to handle missing Buffer Time service
-- This migration updates the trigger to skip buffer creation if the service doesn't exist

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS auto_create_buffer_trigger ON bookings;
DROP FUNCTION IF EXISTS create_buffer_appointment();

-- Recreate function with service_id handling
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
    
    -- If Buffer Time service doesn't exist, skip buffer creation
    -- This prevents the not-null constraint violation
    IF buffer_service_id IS NULL THEN
        -- Log a notice but don't fail
        RAISE NOTICE 'Buffer Time service not found, skipping buffer appointment creation';
        RETURN NEW;
    END IF;

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
            buffer_service_id,
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
            buffer_service_id,
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main booking
        RAISE NOTICE 'Failed to create buffer appointment: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER auto_create_buffer_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_buffer_appointment();

-- Also ensure the Buffer Time service exists with proper category
-- First check if it exists, then insert or update
DO $$
DECLARE
    existing_service_id UUID;
BEGIN
    -- Check if Buffer Time service already exists
    SELECT id INTO existing_service_id
    FROM services
    WHERE name = 'Buffer Time'
    LIMIT 1;
    
    IF existing_service_id IS NULL THEN
        -- Insert new Buffer Time service with all required fields
        INSERT INTO services (
            id,
            name,
            description,
            category,
            ghl_category,
            duration,
            price,
            is_active,
            requires_room_3,
            allows_addons,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(), -- Generate UUID for ID
            'Buffer Time',
            'Preparation and cleanup time between appointments',
            'treatments', -- Using treatments category
            'BODY TREATMENTS & BOOSTERS', -- Required GHL category
            15, -- 15 minutes
            0, -- No charge
            false, -- Not visible to customers
            false, -- Doesn't require room 3
            false, -- No addons allowed
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing Buffer Time service to ensure correct settings
        UPDATE services
        SET 
            category = 'treatments',
            ghl_category = 'BODY TREATMENTS & BOOSTERS',
            duration = 15,
            price = 0,
            is_active = false,
            allows_addons = false,
            updated_at = NOW()
        WHERE id = existing_service_id;
    END IF;
END $$;