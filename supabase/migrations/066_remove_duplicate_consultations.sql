-- Remove duplicate Facial Consultation services
-- Keep only one Facial Consultation service per unique name/price combination

-- First, let's check what consultation services exist
DO $$
DECLARE
    duplicate_count integer;
BEGIN
    -- Count duplicate Facial Consultation services
    SELECT COUNT(*) - 1 INTO duplicate_count
    FROM services
    WHERE name = 'Facial Consultation'
    AND category = 'facials';
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate Facial Consultation service(s)', duplicate_count;
        
        -- Delete duplicates, keeping only the oldest (first created) one
        DELETE FROM services
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY name, category, price ORDER BY created_at, id) as rn
                FROM services
                WHERE name = 'Facial Consultation'
                AND category = 'facials'
            ) t
            WHERE t.rn > 1
        );
        
        RAISE NOTICE 'Removed % duplicate Facial Consultation service(s)', duplicate_count;
    ELSE
        RAISE NOTICE 'No duplicate Facial Consultation services found';
    END IF;
END $$;

-- Also check for any other duplicate consultation services
DO $$
DECLARE
    dup_record RECORD;
    deleted_count integer := 0;
BEGIN
    -- Find and remove any other duplicate services in the consultation/facials category
    FOR dup_record IN 
        SELECT name, category, price, COUNT(*) as cnt
        FROM services
        WHERE category = 'facials'
        AND (LOWER(name) LIKE '%consultation%' OR description LIKE '%consultation%')
        GROUP BY name, category, price
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found % duplicates of: % (category: %, price: %)', 
                     dup_record.cnt - 1, dup_record.name, dup_record.category, dup_record.price;
        
        -- Delete duplicates keeping the oldest
        DELETE FROM services
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY name, category, price ORDER BY created_at, id) as rn
                FROM services
                WHERE name = dup_record.name
                AND category = dup_record.category
                AND price = dup_record.price
            ) t
            WHERE t.rn > 1
        );
        
        deleted_count := deleted_count + (dup_record.cnt - 1);
    END LOOP;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Total duplicates removed: %', deleted_count;
    END IF;
END $$;

-- Ensure we have exactly the consultation services we need
-- Check if we have the required consultation services
DO $$
BEGIN
    -- Ensure we have one Facial Consultation at $25
    IF NOT EXISTS (
        SELECT 1 FROM services 
        WHERE name = 'Facial Consultation' 
        AND category = 'facials'
        AND price = 25
    ) THEN
        INSERT INTO services (
            name, category, description, duration, price, 
            is_addon, active, display_order
        ) VALUES (
            'Facial Consultation',
            'facials',
            'Not sure which facial is right for you? Book a consultation with our skincare experts to create a personalized treatment plan.',
            30,
            25,
            false,
            true,
            1
        );
        RAISE NOTICE 'Added Facial Consultation service';
    END IF;
    
    -- Ensure we have Consultation & Treatment (For Men & Women) with TBD price
    IF NOT EXISTS (
        SELECT 1 FROM services 
        WHERE name = 'Consultation & Treatment (For Men & Women)' 
        AND category = 'facials'
    ) THEN
        INSERT INTO services (
            name, category, description, duration, price, 
            is_addon, active, display_order
        ) VALUES (
            'Consultation & Treatment (For Men & Women)',
            'facials',
            'Professional consultation followed by customized treatment based on your needs. Price determined based on selected treatment.',
            90,
            0, -- TBD price
            false,
            true,
            0
        );
        RAISE NOTICE 'Added Consultation & Treatment service';
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    service_count integer;
    service_record RECORD;
BEGIN
    RAISE NOTICE '=== Final Consultation Services ===';
    
    FOR service_record IN 
        SELECT id, name, category, price, duration, active
        FROM services
        WHERE category = 'facials'
        AND (LOWER(name) LIKE '%consultation%' OR description LIKE '%consultation%')
        ORDER BY display_order, name
    LOOP
        RAISE NOTICE 'Service: % | Category: % | Price: $% | Duration: %min | Active: %',
                     service_record.name, 
                     service_record.category,
                     service_record.price,
                     service_record.duration,
                     service_record.active;
    END LOOP;
    
    -- Count total consultation services
    SELECT COUNT(*) INTO service_count
    FROM services
    WHERE category = 'facials'
    AND (LOWER(name) LIKE '%consultation%' OR description LIKE '%consultation%');
    
    RAISE NOTICE 'Total consultation services: %', service_count;
END $$;