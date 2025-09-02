-- Remove duplicate Facial Consultation service
-- Specifically removes the 'facial_consultation' duplicate, keeping 'consultation'

DELETE FROM services 
WHERE id = 'facial_consultation';

-- Verify only one Facial Consultation remains
DO $$
DECLARE
    remaining_count integer;
    rec record;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM services
    WHERE name = 'Facial Consultation';
    
    RAISE NOTICE 'Remaining Facial Consultation services: %', remaining_count;
    
    -- Show details of remaining service
    FOR rec IN 
        SELECT id, name, price, duration
        FROM services
        WHERE name = 'Facial Consultation'
    LOOP
        RAISE NOTICE 'Service: ID=%, Name=%, Price=$%, Duration=% min', 
                     rec.id, rec.name, rec.price, rec.duration;
    END LOOP;
END $$;