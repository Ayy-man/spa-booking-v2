-- Check which services are marked as couples services
SELECT 
    id,
    name,
    is_couples_service,
    category,
    price,
    duration,
    CASE 
        WHEN is_couples_service = true THEN '🔴 COUPLES SERVICE'
        ELSE '🟢 Single service'
    END as service_type
FROM services 
WHERE is_active = true
ORDER BY is_couples_service DESC, category, name;

-- Count of services by type
SELECT 
    is_couples_service,
    COUNT(*) as count,
    CASE 
        WHEN is_couples_service = true THEN 'Couples Services'
        ELSE 'Single Services'
    END as type
FROM services
WHERE is_active = true
GROUP BY is_couples_service;