# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Medical Spa Booking System to production. The system includes advanced features like admin authentication, real-time monitoring, and comprehensive health checks.

**System Requirements:**
- Node.js 18+
- Supabase PostgreSQL database
- Production-ready hosting platform (Vercel recommended)
- SSL certificate (handled by hosting platform)

## Pre-Deployment Checklist

### 1. Code Quality Verification
```bash
# Run linting and type checking
npm run lint

# Run full test suite
npm run test:ci

# Verify production build
npm run build
```

### 2. Environment Variables Validation
Ensure all required environment variables are configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV=production`

### 3. Database Migration Status
Verify all migrations have been applied in order:
1. `001_initial_schema.sql` - Core database structure
2. `002_rls_policies.sql` - Row Level Security policies
3. `003_booking_functions.sql` - Stored procedures and functions
4. `004_seed_data.sql` - Initial data seeding
5. `005_add_missing_services.sql` - Additional services
6. `006_couples_booking_support.sql` - Couples booking functionality
7. `007_fix_couples_booking_function.sql` - Couples booking fixes
8. `008_admin_users_table.sql` - Admin authentication system

## Step-by-Step Deployment

### Step 1: Supabase Production Setup

#### 1.1 Create Production Project
1. Log into [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project for production
3. Note the project URL and API keys
4. Configure database settings:
   - Enable connection pooling
   - Set appropriate connection limits
   - Configure backup schedules

#### 1.2 Apply Database Migrations
Run migrations in the Supabase SQL Editor:

```sql
-- Execute each migration file in order
-- Check supabase/migrations/ directory for complete scripts
```

#### 1.3 Verify Database Setup
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_stat_user_tables 
WHERE schemaname = 'public';

-- Check admin_users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'admin_users';
```

#### 1.4 Configure Authentication
1. Enable email authentication in Supabase Auth settings
2. Configure email templates for production
3. Set up proper redirect URLs for production domain
4. Configure password policies and security settings

### Step 2: Environment Configuration

#### 2.1 Production Environment Variables
Set these in your deployment platform:

```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Required - Application Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production

# Business Configuration
NEXT_PUBLIC_CLINIC_NAME="Dermal Skin Clinic and Spa Guam"
NEXT_PUBLIC_CLINIC_PHONE="(671) 647-7546"
NEXT_PUBLIC_CLINIC_ADDRESS="123 Marine Corps Dr, Tamuning, GU 96913"
NEXT_PUBLIC_BUSINESS_HOURS_START=09:00
NEXT_PUBLIC_BUSINESS_HOURS_END=19:00
NEXT_PUBLIC_MAX_ADVANCE_BOOKING_DAYS=30
NEXT_PUBLIC_BUFFER_TIME_MINUTES=15
```

#### 2.2 Security Configuration
- Ensure environment variables are stored securely
- Rotate API keys regularly
- Use proper CORS settings in Supabase
- Configure proper domain allowlists

### Step 3: Vercel Deployment

#### 3.1 Automated Deployment Setup
1. Connect GitHub repository to Vercel
2. Configure build settings:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm ci"
   }
   ```
3. Set up automatic deployments on main branch push

#### 3.2 Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### 3.3 Vercel Configuration
Create `vercel.json` in project root:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### Step 4: Post-Deployment Verification

#### 4.1 Health Check Validation
Test the health endpoint:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.456,
  "timestamp": "2025-08-01T...",
  "responseTime": 45,
  "environment": "production",
  "checks": {
    "database": "ok",
    "environment": "ok"
  }
}
```

#### 4.2 Functional Testing
Test critical user flows:
1. **Booking Flow**: Complete a test booking
2. **Admin Authentication**: Login to admin panel
3. **Admin Functions**: Create/view/update bookings
4. **Couples Booking**: Test couples booking functionality
5. **Mobile Responsiveness**: Test on mobile devices

#### 4.3 Performance Validation
- Page load times < 3 seconds
- API response times < 2 seconds
- Database query performance acceptable
- No JavaScript errors in console

## Security Considerations

### Database Security
- Row Level Security (RLS) enabled on all tables
- Proper authentication policies configured
- Admin access properly restricted
- Service role key protected and not exposed

### Application Security
- Environment variables validation
- Input sanitization implemented
- CSRF protection enabled
- XSS prevention measures in place
- Proper error handling without information leakage

### Infrastructure Security
- HTTPS enforced (handled by Vercel)
- Secure headers configured
- API rate limiting (if needed)
- Regular security updates

## Monitoring and Maintenance

### Health Monitoring
Set up monitoring for:
- Application availability (`/api/health`)
- Database connectivity
- Error rates and response times
- User booking success rates

### Performance Monitoring
- Page load times
- API response times
- Database query performance
- User experience metrics

### Backup and Recovery
- Database backups configured in Supabase
- Environment variables documented securely
- Deployment rollback procedures established
- Data recovery procedures tested

### Regular Maintenance Tasks
- **Weekly**: Check application logs and error rates
- **Monthly**: Review and rotate API keys
- **Quarterly**: Performance optimization review
- **Annually**: Security audit and dependency updates

## Troubleshooting

### Common Issues

#### Environment Variable Errors
```bash
# Validate environment variables
npm run test:ci

# Check specific variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

#### Database Connection Issues
1. Verify Supabase project is active
2. Check API keys are correct
3. Ensure RLS policies allow access
4. Verify connection pooling settings

#### Build Failures
1. Check TypeScript errors: `npm run build`
2. Verify all dependencies: `npm ci`
3. Check environment variables are set
4. Review build logs for specific errors

#### Performance Issues
1. Check database query performance in Supabase
2. Review bundle size and optimize if needed
3. Verify proper caching headers
4. Check for memory leaks in long-running processes

### Support and Contact
- **Technical Issues**: Check GitHub issues and documentation
- **Database Issues**: Supabase support and documentation
- **Deployment Issues**: Vercel support and documentation
- **Business Logic**: Refer to `/docs` directory

## Rollback Procedures

### Application Rollback
1. Revert to previous Vercel deployment
2. Update DNS if necessary
3. Verify functionality with health checks

### Database Rollback
1. Use Supabase point-in-time recovery
2. Re-apply necessary migrations
3. Verify data integrity

### Emergency Contacts
Maintain a list of emergency contacts for:
- Database administrator
- Hosting platform support
- Business stakeholders
- Technical team leads

---

**Last Updated**: August 1, 2025  
**Version**: 2.0.0  
**Status**: Production Ready