# 🚀 Deploy Database Functions to Supabase

## Status: ⚠️ MISSING FUNCTIONS DETECTED

The verification shows that staff availability is working for all service categories, but some PostgreSQL functions are missing from the Supabase schema cache.

## ✅ What's Working:
- Staff availability queries for all 6 service categories (facials, massages, treatments, waxing, packages, special)
- Database connection and basic queries
- The core booking flow should now work correctly

## ❌ Missing Functions:
- `get_available_staff_for_service()`
- `can_staff_perform_service()` 
- `get_staff_service_categories()`

## 🛠️ Quick Fix Instructions:

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Open your "medspa" project
3. Navigate to SQL Editor

### Step 2: Execute Missing Functions
Copy and paste this SQL into the SQL Editor and run it:

```sql
-- Function to get available staff for a specific service category and day
CREATE OR REPLACE FUNCTION get_available_staff_for_service(
    service_category TEXT,
    day_of_week INTEGER
)
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    specialties TEXT,
    capabilities service_category[],
    work_days INTEGER[],
    default_room_id INTEGER,
    role staff_role,
    initials TEXT,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN,
    auth_user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.email,
        s.phone,
        s.specialties,
        s.capabilities,
        s.work_days,
        s.default_room_id,
        s.role,
        s.initials,
        s.hourly_rate,
        s.is_active,
        s.auth_user_id,
        s.created_at,
        s.updated_at
    FROM staff s
    WHERE s.is_active = true
    AND (
        service_category::service_category = ANY(s.capabilities)
        OR s.id = 'any'
    )
    AND (
        day_of_week = ANY(s.work_days)
    )
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a specific staff member can perform a service
CREATE OR REPLACE FUNCTION can_staff_perform_service(
    staff_id_param TEXT,
    service_category_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    staff_capabilities service_category[];
BEGIN
    SELECT capabilities INTO staff_capabilities 
    FROM staff 
    WHERE id = staff_id_param AND is_active = true;
    
    IF staff_capabilities IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN (
        service_category_param::service_category = ANY(staff_capabilities)
        OR staff_id_param = 'any'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all service categories that a staff member can perform
CREATE OR REPLACE FUNCTION get_staff_service_categories(
    staff_id_param TEXT
)
RETURNS service_category[] AS $$
DECLARE
    staff_capabilities service_category[];
BEGIN
    SELECT capabilities INTO staff_capabilities 
    FROM staff 
    WHERE id = staff_id_param AND is_active = true;
    
    RETURN COALESCE(staff_capabilities, ARRAY[]::service_category[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_staff_for_service(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_for_service(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION can_staff_perform_service(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_staff_perform_service(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_staff_service_categories(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_service_categories(TEXT) TO anon;
```

### Step 3: Verify Deployment
After running the SQL, refresh the verification page to confirm all functions are working.

## 🎯 Current Status Summary:

### ✅ WORKING CORRECTLY:
- **Staff Availability**: All 6 service categories return available staff
- **Database Integration**: Successfully connected to Supabase
- **Core Booking Flow**: Should work end-to-end
- **PostgreSQL Array Fixes**: Enum array queries are working

### 🔧 NEEDS DEPLOYMENT:
- Missing PostgreSQL functions in schema cache
- Run the SQL above in Supabase dashboard to complete deployment

## 🚨 Important Notes:

1. **Booking System is Functional**: Even without the missing functions, staff availability is working for all services
2. **Main Issue Resolved**: The "no staff available" problem has been fixed
3. **Optional Enhancement**: The missing functions provide additional optimization and capability checking

The core problem (staff availability showing "no staff available for all services") has been **successfully resolved**. The missing functions are optimizations that can be deployed when convenient.