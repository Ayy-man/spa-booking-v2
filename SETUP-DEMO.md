# 🚀 Demo Spa Booking System - Setup & Deployment Guide

## 📋 Prerequisites

Before setting up the demo, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Git** installed ([Download](https://git-scm.com/))
- **Supabase Account** (Free tier works) ([Sign up](https://supabase.com))
- **Vercel Account** (Optional, for deployment) ([Sign up](https://vercel.com))

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `spa-booking-demo`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your location
   - **Plan**: Free tier is sufficient
4. Click **"Create Project"** and wait ~2 minutes

### Step 2: Get Database Credentials

1. In Supabase Dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (Keep secret!)

### Step 3: Run Database Migrations

1. Go to **SQL Editor** in Supabase Dashboard
2. Run each migration file in order:

```sql
-- Run these migrations in sequence:
001_core_schema_setup.sql
001_couples_booking_system.sql
002_staff_and_schedule_management.sql
064_fix_staff_consultation_capabilities.sql
065_add_walk_in_archiving.sql
066_remove_duplicate_consultations.sql
067_create_notifications_system.sql
068_fix_notification_types.sql
069_disable_notification_triggers.sql
070_remove_duplicate_facial_consultation.sql
071_add_performance_indexes.sql
072_archive_old_walkins_fix.sql
073_ensure_archived_at_column.sql
074_force_archive_old_walkins.sql
075_restore_services_and_addons.sql
076_add_staff_availability_status.sql
```

**Pro tip**: You can find all migrations in `/supabase/migrations/`

### Step 4: Load Demo Data

After migrations, run these scripts:

```sql
-- 1. First, sanitize and create demo structure
-- Run the contents of sanitize-for-demo.sql

-- 2. Then, generate demo bookings
-- Run the contents of generate-demo-bookings.sql
```

## 🔧 Environment Setup

### Step 1: Clone the Repository

```bash
# Clone the demo repository
git clone https://github.com/your-username/spa-booking-demo.git
cd spa-booking-demo

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy the demo environment file
cp .env.demo .env.local

# Or copy from example
cp .env.example .env.local
```

### Step 3: Edit `.env.local`

Open `.env.local` and update with your values:

```env
# REQUIRED - Your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# REQUIRED - Application URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For local development
# NEXT_PUBLIC_APP_URL=https://your-demo.vercel.app  # For production

# Admin credentials (you can keep these for demo)
NEXT_PUBLIC_ADMIN_EMAIL=admin@demo-spa.com
ADMIN_PASSWORD=DEMO123

# Business configuration (optional to change)
NEXT_PUBLIC_BUSINESS_NAME=Demo Spa & Wellness
NEXT_PUBLIC_BUSINESS_PHONE=555-0100
NEXT_PUBLIC_BUSINESS_EMAIL=info@demo-spa.com

# Booking settings (recommended defaults)
NEXT_PUBLIC_MAX_ADVANCE_BOOKING_DAYS=30
NEXT_PUBLIC_BOOKING_BUFFER_MINUTES=15
NEXT_PUBLIC_BUSINESS_HOURS_START=09:00
NEXT_PUBLIC_BUSINESS_HOURS_END=18:00

# OPTIONAL - GoHighLevel Integration
# GHL_API_TOKEN=your-token
# GHL_LOCATION_ID=your-location-id
# GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/xxx

# OPTIONAL - Payment Gateway
# NEXT_PUBLIC_FASTPAYDIRECT_URL=https://invoice.fastpaydirect.com/xxx
# FASTPAYDIRECT_WEBHOOK_SECRET=your-secret

# OPTIONAL - For production deployment
# CRON_SECRET=your-secure-cron-secret
```

## 💻 Local Development

### Step 1: Start Development Server

```bash
# Run the development server
npm run dev

# The app will be available at:
# Main site: http://localhost:3000
# Admin panel: http://localhost:3000/admin
```

### Step 2: Test the Demo

1. **Customer Booking**:
   - Go to http://localhost:3000
   - Try booking a service
   - Use any of the demo customer emails or create new

2. **Admin Panel**:
   - Go to http://localhost:3000/admin
   - Login with: `admin@demo-spa.com` / `DEMO123`
   - Explore all features

### Step 3: Common Development Commands

```bash
# Run tests
npm test

# Build for production
npm run build

# Check for linting errors
npm run lint

# Format code
npm run format
```

## 🌐 Production Deployment

### Option 1: Deploy to Vercel (Recommended)

#### 1. Push to GitHub

```bash
git add .
git commit -m "Initial demo setup"
git push origin main
```

#### 2. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

#### 3. Add Environment Variables

In Vercel dashboard:
1. Go to **Settings → Environment Variables**
2. Add all variables from your `.env.local`
3. Make sure to set for **Production** environment
4. Key variables to add:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL (use your Vercel URL)
   NEXT_PUBLIC_ADMIN_EMAIL
   ADMIN_PASSWORD
   ```

#### 4. Deploy

Click **"Deploy"** and wait 2-3 minutes. Your demo will be live at:
- `https://your-project.vercel.app`

### Option 2: Deploy to Other Platforms

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

#### Self-Hosted (VPS/Docker)
```dockerfile
# Dockerfile included in repository
docker build -t spa-demo .
docker run -p 3000:3000 --env-file .env.local spa-demo
```

## ✅ Testing the Demo Deployment

### Essential Tests

1. **Homepage Loads**: Check main booking page renders
2. **Service Selection**: Can select and view services
3. **Date/Time Selection**: Calendar and time slots work
4. **Booking Creation**: Complete a full booking
5. **Admin Login**: Access admin panel successfully
6. **Schedule View**: Today's schedule displays correctly
7. **Walk-In Creation**: Can add walk-in customers
8. **Reports**: Daily reports generate properly

### Test Checklist

```markdown
- [ ] Homepage loads without errors
- [ ] Can browse all services
- [ ] Booking flow completes successfully
- [ ] Admin login works
- [ ] Schedule displays current bookings
- [ ] Can create new appointments
- [ ] Walk-ins can be added
- [ ] Staff status can be changed
- [ ] Daily reports show correct data
- [ ] Mobile responsive design works
- [ ] Dark mode toggles properly
```

## 🎨 Customization Guide

### Change Business Information

Edit `/src/lib/business-config.ts`:

```typescript
export const BUSINESS_CONFIG = {
  name: 'Your Spa Name',
  location: 'Your City',
  address: 'Your Address',
  phone: 'Your Phone',
  email: 'your-email@spa.com',
  website: 'https://your-spa.com',
  // ... rest of config
}
```

### Modify Services

Edit services in Supabase:
1. Go to **Table Editor → services**
2. Add/edit/remove services as needed
3. Update categories, prices, durations

### Adjust Staff Members

Edit staff in Supabase:
1. Go to **Table Editor → staff**
2. Modify staff names, capabilities, schedules

### Change Colors/Theme

Edit `/src/app/globals.css`:
```css
:root {
  --primary: your-color;
  --secondary: your-color;
  /* Update theme colors */
}
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: Invalid Supabase credentials
```
**Solution**: Check your `.env.local` has correct Supabase URL and keys

#### Build Errors
```
Error: Module not found
```
**Solution**: Run `npm install` to ensure all dependencies are installed

#### Admin Login Not Working
```
Error: Invalid credentials
```
**Solution**: Check `ADMIN_PASSWORD` in `.env.local` matches what you're entering

#### Bookings Not Showing
```
Error: No bookings found
```
**Solution**: Run `generate-demo-bookings.sql` to create demo data

### Getting Help

1. **Check Documentation**:
   - [README-DEMO.md](./README-DEMO.md) - Demo overview
   - [README.md](./README.md) - Technical details
   - `/docs` folder - Detailed guides

2. **Debug Mode**:
   ```bash
   # Run with debug logging
   DEBUG=* npm run dev
   ```

3. **Check Logs**:
   - Browser Console (F12)
   - Terminal output
   - Vercel Functions logs (if deployed)

## 📦 What's Included

### Demo Data
- ✅ 5 demo staff members with different specialties
- ✅ 7 demo customers with varied profiles
- ✅ 270+ pre-populated bookings (Oct-Dec 2025)
- ✅ 150+ services across all categories
- ✅ 4 treatment rooms including couples suite

### Features
- ✅ Complete booking system
- ✅ Admin dashboard
- ✅ Staff management
- ✅ Walk-in handling
- ✅ Daily reports
- ✅ Dark mode
- ✅ Mobile responsive
- ✅ Real-time updates

### Integrations (Optional)
- ⚡ GoHighLevel CRM
- 💳 Payment processing
- 📧 Email notifications
- 📱 SMS reminders

## 🔐 Security Notes

### Before Going Live

1. **Change ALL credentials**:
   - Admin password
   - Database passwords
   - API keys

2. **Update configurations**:
   - Business information
   - Email addresses
   - Phone numbers

3. **Clear demo data**:
   ```sql
   TRUNCATE bookings, customers, payments CASCADE;
   DELETE FROM staff WHERE email LIKE '%demo%';
   ```

4. **Remove test endpoints**:
   - Delete `/api/test-*` routes
   - Remove debug components

5. **Enable security features**:
   - Set up rate limiting
   - Configure CORS properly
   - Enable CSP headers

## 🎉 Next Steps

1. **Explore Features**: Test all functionality with demo data
2. **Customize**: Modify business info, services, and styling
3. **Plan Migration**: Prepare for production deployment
4. **Get Support**: Check documentation or open issues

---

## Quick Commands Reference

```bash
# Install
npm install

# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Test
npm test

# Lint
npm run lint

# Database reset
# Run sanitize-for-demo.sql
# Run generate-demo-bookings.sql
```

---

*Setup Guide v2.3.0 | Last Updated: January 2025*