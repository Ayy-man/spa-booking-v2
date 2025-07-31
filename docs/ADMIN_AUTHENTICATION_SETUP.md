# Admin Authentication System Setup

This document provides a complete guide for setting up the admin authentication system for the Dermal Skin Clinic and Spa booking application.

## Overview

The authentication system includes:
- Middleware protection for admin routes
- Supabase Auth integration with email/password
- Role-based access control (Admin/Staff)
- Secure admin panel with logout functionality
- Row Level Security (RLS) policies
- Session management and validation

## File Structure

```
/src
├── lib/
│   └── auth.ts                    # Authentication utilities
├── app/
│   └── admin/
│       ├── layout.tsx             # Admin layout with navigation
│       ├── login/
│       │   └── page.tsx           # Admin login page
│       └── bookings/
│           └── page.tsx           # Protected bookings page
└── middleware.ts                  # Route protection middleware
admin-auth-setup.sql               # Database setup script
```

## Setup Instructions

### 1. Database Setup

1. **Run the SQL Setup Script**
   ```sql
   -- Execute the entire content of admin-auth-setup.sql in your Supabase SQL editor
   ```

2. **Create Your First Admin User**
   
   First, register the admin user through normal Supabase Auth (either through the admin panel sign-up or programmatically):
   
   ```sql
   -- Replace with your actual admin email
   SELECT create_first_admin('admin@dermalspa.com');
   ```

3. **Verify Admin User Creation**
   ```sql
   SELECT au.*, u.email as user_email 
   FROM admin_users au 
   JOIN auth.users u ON au.user_id = u.id 
   WHERE au.is_active = true;
   ```

### 2. Environment Variables

Ensure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Application Files

All necessary files have been created:

- ✅ `/src/lib/auth.ts` - Authentication utilities
- ✅ `/middleware.ts` - Route protection middleware
- ✅ `/src/app/admin/login/page.tsx` - Login page
- ✅ `/src/app/admin/layout.tsx` - Admin layout
- ✅ Updated `/src/app/admin/bookings/page.tsx` - Protected bookings page
- ✅ `/admin-auth-setup.sql` - Database setup script

## Features

### 🔐 Authentication Features

1. **Secure Login**
   - Email/password authentication via Supabase Auth
   - Session management with automatic redirect
   - Error handling with user-friendly messages

2. **Route Protection**
   - Middleware protects all `/admin/*` routes except `/admin/login`
   - Automatic redirect to login for unauthenticated users
   - Admin privilege verification

3. **Role-Based Access**
   - Support for 'admin' and 'staff' roles
   - Fallback to user metadata if admin_users table doesn't exist
   - Extensible role system

4. **Admin Panel**
   - Clean, responsive admin layout
   - Navigation with active state indicators
   - Logout functionality with loading states
   - Mobile-responsive design

### 🛡️ Security Features

1. **Row Level Security (RLS)**
   - All admin tables protected with RLS policies
   - Admin-only access to sensitive data
   - Automatic user verification for all operations

2. **Session Validation**
   - Server-side session validation
   - Token-based authentication
   - Automatic session refresh

3. **Middleware Protection**
   - Request-level protection
   - Proper error handling and redirects
   - Performance optimized with route exclusions

## Usage

### Accessing the Admin Panel

1. **Navigate to Admin Login**
   ```
   https://yourdomain.com/admin/login
   ```

2. **Login with Admin Credentials**
   - Use the email/password of a user in the `admin_users` table
   - Only users with 'admin' or 'staff' roles can access

3. **Admin Panel Navigation**
   - After login, you'll be redirected to `/admin/bookings`
   - Navigation is available in the header
   - Logout button is in the top-right corner

### Adding More Admin Users

1. **Method 1: Direct SQL (Recommended)**
   ```sql
   -- First, ensure the user has registered through Supabase Auth
   INSERT INTO admin_users (user_id, email, role, is_active, created_by) 
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'new-admin@example.com'),
     'new-admin@example.com',
     'admin', -- or 'staff'
     true,
     (SELECT user_id FROM admin_users WHERE role = 'admin' LIMIT 1)
   );
   ```

2. **Method 2: Through Application (Future Enhancement)**
   - Can be implemented as an admin user management page
   - Would allow existing admins to invite new admin users

### Managing Admin Users

```sql
-- View all admin users
SELECT au.*, u.email as user_email, u.created_at as user_created_at
FROM admin_users au 
JOIN auth.users u ON au.user_id = u.id 
ORDER BY au.created_at DESC;

-- Deactivate an admin user
UPDATE admin_users 
SET is_active = false, updated_at = NOW()
WHERE email = 'user@example.com';

-- Reactivate an admin user
UPDATE admin_users 
SET is_active = true, updated_at = NOW()
WHERE email = 'user@example.com';

-- Change user role
UPDATE admin_users 
SET role = 'staff', updated_at = NOW()
WHERE email = 'user@example.com';
```

## Troubleshooting

### Common Issues

1. **"Access denied. Admin privileges required."**
   - User exists in auth.users but not in admin_users table
   - Solution: Add user to admin_users table with appropriate role

2. **"Invalid token" or redirects to login**
   - Session expired or invalid
   - Solution: Clear browser cookies and log in again

3. **Middleware not working**
   - Check that middleware.ts is in the project root
   - Verify environment variables are set correctly

4. **Database permission errors**
   - RLS policies might be too restrictive
   - Check that admin_users table exists and has correct policies

### Debug Commands

```sql
-- Check if user exists in auth
SELECT id, email, created_at FROM auth.users WHERE email = 'user@example.com';

-- Check if user is in admin_users
SELECT * FROM admin_users WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);

-- Test the is_admin_user function
SELECT is_admin_user((SELECT id FROM auth.users WHERE email = 'user@example.com'));
```

## Future Enhancements

1. **Admin User Management UI**
   - Add/remove admin users through the web interface
   - Role management and permissions

2. **Audit Logging**
   - Track admin actions and changes
   - Login/logout logging

3. **Two-Factor Authentication**
   - Add 2FA for enhanced security
   - SMS or TOTP support

4. **Password Reset**
   - Admin-specific password reset flow
   - Email notifications for security events

5. **Session Management**
   - Active session monitoring
   - Force logout capabilities

## Security Considerations

1. **Use HTTPS in Production**
   - All authentication must be over HTTPS
   - Configure proper SSL certificates

2. **Regular Security Audits**
   - Review admin user access regularly
   - Monitor login attempts and failures

3. **Environment Variables**
   - Never commit sensitive keys to version control
   - Use proper secret management in production

4. **Database Backups**
   - Regular backups of admin_users table
   - Test restoration procedures

## Support

For issues with the authentication system:

1. Check this documentation first
2. Verify database setup and RLS policies
3. Check browser console for client-side errors
4. Review server logs for authentication failures
5. Test with a clean browser session (incognito mode)

The authentication system is production-ready and follows security best practices for Supabase and Next.js applications.