# Daily Reports & Analytics

## Overview
The spa booking system includes comprehensive daily reporting functionality with automated email delivery through n8n webhook integration. Reports are beautifully formatted with the spa's signature pink branding and sent automatically every day at 6pm Guam time.

## Features

### 📊 Daily Summary Dashboard
- **Location**: Admin Dashboard → Daily Report tab
- **Access**: Admin users only
- **Purpose**: View and send comprehensive daily business metrics

### 📈 Metrics Included

#### Overview Statistics
- Total appointments for the day
- Completed appointments count
- No-show tracking
- Cancellation monitoring
- Total revenue collected
- Deposit collection tracking

#### Staff Performance
- Individual staff appointment counts
- Revenue generated per staff member
- Performance ranking by revenue

#### Service Breakdown
- Appointments grouped by service category
- Visual breakdown of:
  - Facials
  - Massages
  - Body Treatments
  - Body Scrubs
  - Waxing
  - Packages

#### Tomorrow's Preview
- Total bookings for next day
- First appointment time
- Last appointment time

## 🔄 Automated Daily Reports

### Schedule
- **Automatic Send Time**: 6:00 PM Guam Time (UTC+10) daily
- **Manual Send**: Available anytime via "Email Report" button

### Webhook Integration
The system sends reports to n8n for email processing:
- **Endpoint**: `https://primary-production-66f3.up.railway.app/webhook/bcab11df-b41a-42db-933b-0f187174ce35`
- **Method**: POST
- **Content-Type**: application/json

### Data Structure
```json
{
  "type": "daily_report",
  "spa_name": "Dermal Skin Care & Spa",
  "recipient_email": "happyskinhappyyou@gmail.com",
  "report_date": "2024-08-17",
  "data": {
    "date": "2024-08-17",
    "overview": {
      "totalAppointments": 12,
      "completed": 10,
      "noShows": 1,
      "cancelled": 1,
      "totalRevenue": 1450,
      "depositsCollected": 6
    },
    "staffPerformance": [
      {
        "name": "Selma Villaver",
        "appointments": 4,
        "revenue": 580
      }
    ],
    "serviceBreakdown": {
      "facial": 5,
      "massage": 3,
      "body_treatment": 2,
      "waxing": 2
    },
    "tomorrowPreview": {
      "totalBookings": 8,
      "firstAppointment": "9:00 AM",
      "lastAppointment": "6:30 PM"
    }
  },
  "timestamp": "2024-08-17T20:00:00Z",
  "automated": true  // Flag indicates if sent automatically
}
```

## 🛠️ Configuration

### Environment Variables
Add to your `.env.local`:
```bash
# Cron Job Security (for Vercel Cron)
CRON_SECRET=your-secure-cron-secret-here
```

### Vercel Cron Configuration
The `vercel.json` includes:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 8 * * *"  // 8 UTC = 6pm Guam
    }
  ]
}
```

## 📱 User Interface

### Navigation
1. Go to Admin Dashboard
2. Click "Daily Report" tab
3. Use date picker to select any date
4. View comprehensive metrics
5. Click "Email Report" to send manually

### Features
- **Date Navigation**: Previous/Next buttons, "Today" quick return
- **Loading States**: Skeleton cards while fetching
- **Error Handling**: Friendly error messages with retry
- **Success Notifications**: Green confirmation when sent
- **Responsive Design**: Works on all screen sizes

## 🔧 API Endpoints

### `/api/admin/daily-summary`
- **Method**: GET
- **Query Parameters**: `date` (YYYY-MM-DD format)
- **Returns**: DailySummaryData JSON
- **Authentication**: Admin access required

### `/api/cron/daily-report`
- **Method**: GET/POST
- **Purpose**: Automated daily report sending
- **Schedule**: 6pm Guam time daily
- **Security**: CRON_SECRET verification in production

## 📧 n8n Workflow Integration

The n8n workflow receives the webhook and can:
1. Format the data into a beautiful HTML email
2. Send to specified recipients
3. Save to Google Sheets for historical tracking
4. Trigger additional automations
5. Send SMS notifications if needed

## 🚀 Testing

### Manual Test
1. Navigate to Daily Report tab
2. Select a date with bookings
3. Click "Email Report"
4. Check for success message

### Webhook Test
```bash
curl -X POST https://primary-production-66f3.up.railway.app/webhook/bcab11df-b41a-42db-933b-0f187174ce35 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_report",
    "test": true,
    "data": {/* test data */}
  }'
```

## 📝 Notes

- Reports are generated in real-time from database
- No historical report storage in the app (handled by n8n)
- Timezone is fixed to Guam (UTC+10)
- Email formatting is handled by n8n, not the app
- App remains lightweight - only sends JSON data

## 📧 Email Template

### Beautiful HTML Emails
The system includes a professionally designed HTML email template featuring:
- **Pink gradient header** matching Dermal's branding (#ec407a to #f48fb1)
- **Soft pink backgrounds** for a spa aesthetic
- **Color-coded metric cards** for easy reading
- **Responsive design** that works on all devices
- **Professional footer** with contact information

### Template Files
- **`docs/email-template.html`** - Complete HTML email template
- **`docs/n8n-email-formatter.js`** - JavaScript code for n8n to format the JSON data

### n8n Email Workflow Setup

1. **Add Code Node** after webhook trigger:
   - Paste contents of `n8n-email-formatter.js`
   - Set to "Run Once for All Items"

2. **Connect Email Node**:
   - To: `{{ $json.recipient }}`
   - Subject: `{{ $json.subject }}`
   - HTML Content: `{{ $json.htmlBody }}`

3. **Automatic Formatting**:
   - Currency with proper symbols and commas
   - Dates in readable format
   - Timezone conversion to Guam time
   - Graceful handling of empty data

### Email Color Scheme
- **Primary Pink**: #ec407a
- **Dark Pink**: #880e4f  
- **Light Pink Backgrounds**: #fce4ec, #fff3f7
- **Success Green**: #43a047
- **Warning Red**: #e53935
- **Info Blue**: #1976d2

## 🔒 Security

- Admin authentication required for manual reports
- CRON_SECRET protects automated endpoint
- No sensitive data exposed in client
- All data fetched server-side
- Webhook URL can be rotated in n8n if needed