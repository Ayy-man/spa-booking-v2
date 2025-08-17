# 🚀 Spa Booking System - Quick Deployment Guide

## What You Need to Do

### 1. Set Up Your Environment Variables
Copy `.env.example` to `.env.local` and fill in your actual values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your real values:
- **NEXT_PUBLIC_APP_URL**: Your actual domain (e.g., `https://booking.dermalskin.com`)
- **Supabase keys**: Get from your Supabase dashboard
- **GHL keys**: Get from GoHighLevel if you're using it
- **Payment keys**: Your FastPayDirect webhook details

### 2. Deploy to Vercel (Easiest Option)

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Production ready updates"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables in Vercel**:
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables from your `.env.local`
   - Make sure to add them for "Production" environment

4. **Deploy**:
   - Click "Deploy"
   - Wait ~2-3 minutes
   - Your site will be live!

### 3. Test Your Deployment

After deployment, test these critical paths:
1. Book an appointment as a new customer
2. Check the database to confirm booking saved
3. Test payment flow
4. Check admin panel at `/admin`

## What We Already Fixed

✅ **Cleaned up** temporary SQL files  
✅ **Removed** debug console.log statements  
✅ **Created** logger service for production  
✅ **Fixed** test setup issues  
✅ **Created** `.env.example` template  

## Production Checklist

- [ ] Update `.env.local` with production values
- [ ] Push code to GitHub
- [ ] Deploy to Vercel
- [ ] Add environment variables in Vercel
- [ ] Test booking flow
- [ ] Test payment integration
- [ ] Verify database connections

## Important URLs After Deployment

- **Main Site**: `https://your-domain.com`
- **Admin Panel**: `https://your-domain.com/admin`
- **Payment Links**: `https://your-domain.com/admin/payment-links`

## Need Help?

1. **Database not connecting?** 
   - Check Supabase URL and keys in Vercel env vars

2. **Payments not working?**
   - Verify GHL webhook URLs and secrets

3. **White screen?**
   - Check browser console for errors
   - Verify all environment variables are set

## Quick Commands

```bash
# Build locally to test
npm run build

# Run production build locally
npm run start

# Check for issues
npm run type-check
```

That's it! Your spa booking system should be live in about 5 minutes.