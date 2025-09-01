-- Remove duplicate Facial Consultation service (keeping only one)
-- This migration specifically removes extra Facial Consultation entries

DO $$
DECLARE
    duplicate_count integer;
    kept_service_id uuid;
BEGIN
    -- Count how many Facial Consultation services exist
    SELECT COUNT(*) INTO duplicate_count
    FROM services
    WHERE name = 'Facial Consultation'
    AND category = 'facials'
    AND is_active = true;
    
    IF duplicate_count > 1 THEN
        RAISE NOTICE 'Found % Facial Consultation services, removing duplicates...', duplicate_count;
        
        -- Keep the first one (by created_at or id) and store its ID
        SELECT id INTO kept_service_id
        FROM services
        WHERE name = 'Facial Consultation'
        AND category = 'facials'
        AND is_active = true
        ORDER BY created_at ASC, id ASC
        LIMIT 1;
        
        RAISE NOTICE 'Keeping service with ID: %', kept_service_id;
        
        -- Delete all other Facial Consultation services
        DELETE FROM services
        WHERE name = 'Facial Consultation'
        AND category = 'facials'
        AND id != kept_service_id;
        
        RAISE NOTICE 'Removed % duplicate Facial Consultation service(s)', duplicate_count - 1;
    ELSIF duplicate_count = 1 THEN
        RAISE NOTICE 'Only one Facial Consultation service found - no duplicates to remove';
    ELSE
        RAISE NOTICE 'No Facial Consultation services found';
    END IF;
END $$;

-- Verify the result
DO $$
DECLARE
    final_count integer;
BEGIN
    SELECT COUNT(*) INTO final_count
    FROM services
    WHERE name = 'Facial Consultation'
    AND category = 'facials'
    AND is_active = true;
    
    RAISE NOTICE 'Final count of active Facial Consultation services: %', final_count;
    
    -- Show the remaining service details
    FOR rec IN 
        SELECT id, name, price, duration, description
        FROM services
        WHERE name = 'Facial Consultation'
        AND category = 'facials'
        AND is_active = true
    LOOP
        RAISE NOTICE 'Service: ID=%, Name=%, Price=$%, Duration=% min', 
                     rec.id, rec.name, rec.price, rec.duration;
    END LOOP;
END $$;