// n8n Code Node - Email Formatter for Daily Reports
// Place this in an n8n Code node after your webhook trigger

// Get the incoming webhook data
const webhookData = $input.first().json.body;

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Helper function to format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Pacific/Guam'
  };
  return date.toLocaleString('en-US', options) + ' (Guam Time)';
}

// Helper function to capitalize service categories
function formatServiceCategory(category) {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Extract data from webhook
const reportData = webhookData.data;
const overview = reportData.overview;
const staffPerformance = reportData.staffPerformance || [];
const serviceBreakdown = reportData.serviceBreakdown || {};
const tomorrowPreview = reportData.tomorrowPreview;

// Generate staff rows HTML
let staffRowsHtml = '';
staffPerformance.forEach((staff, index) => {
  const borderStyle = index === staffPerformance.length - 1 ? '' : 'border-bottom: 1px solid #fce4ec;';
  staffRowsHtml += `
    <tr style="${borderStyle}">
      <td style="padding: 12px; color: #424242; font-size: 14px;">${staff.name}</td>
      <td style="padding: 12px; text-align: center; color: #424242; font-size: 14px;">${staff.appointments}</td>
      <td style="padding: 12px; text-align: right; color: #424242; font-size: 14px; font-weight: 600;">$${formatCurrency(staff.revenue)}</td>
    </tr>`;
});

// If no staff data, show a message
if (staffRowsHtml === '') {
  staffRowsHtml = `
    <tr>
      <td colspan="3" style="padding: 20px; text-align: center; color: #880e4f; font-size: 14px;">
        No staff appointments recorded for this date
      </td>
    </tr>`;
}

// Generate service categories HTML
let serviceCategoriesHtml = '';
Object.entries(serviceBreakdown).forEach(([category, count]) => {
  serviceCategoriesHtml += `
    <tr>
      <td style="padding: 6px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff; border: 1px solid #fce4ec; border-radius: 6px;">
          <tr>
            <td style="padding: 10px 15px; color: #880e4f; font-size: 14px;">${formatServiceCategory(category)}</td>
            <td style="padding: 10px 15px; text-align: right;">
              <span style="background-color: #ec407a; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; display: inline-block;">${count}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
});

// If no services, show a message
if (serviceCategoriesHtml === '') {
  serviceCategoriesHtml = `
    <tr>
      <td style="padding: 20px; text-align: center; color: #880e4f; font-size: 14px; background-color: #fff3f7; border-radius: 8px;">
        No services recorded for this date
      </td>
    </tr>`;
}

// Read the HTML template (you'll need to store this in n8n or fetch it)
// For n8n, you can store the template in a Set node before this Code node
const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Report - Dermal Skin Care & Spa</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fce4ec; min-height: 100vh;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fce4ec; padding: 20px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ec407a 0%, #f48fb1 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
                                DERMAL SKIN CARE & SPA
                            </h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                                Daily Performance Report
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Date Banner -->
                    <tr>
                        <td style="background-color: #fff3f7; padding: 20px 30px; border-bottom: 1px solid #fce4ec;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0; color: #880e4f; font-size: 18px; font-weight: 500;">
                                            📅 {{DATE}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Overview Section -->
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #ec407a; font-size: 20px; margin: 0 0 20px 0; font-weight: 500;">
                                Today's Overview
                            </h2>
                            
                            <!-- Metrics Grid -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="padding: 0 5px 10px 0;" width="50%">
                                        <div style="background: linear-gradient(135deg, #fff 0%, #fce4ec 100%); border: 1px solid #f8bbd0; border-radius: 8px; padding: 15px; text-align: center;">
                                            <p style="margin: 0; color: #880e4f; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total Appointments</p>
                                            <p style="margin: 5px 0 0 0; color: #ec407a; font-size: 32px; font-weight: bold;">{{TOTAL_APPOINTMENTS}}</p>
                                        </div>
                                    </td>
                                    <td style="padding: 0 0 10px 5px;" width="50%">
                                        <div style="background: linear-gradient(135deg, #fff 0%, #e8f5e9 100%); border: 1px solid #a5d6a7; border-radius: 8px; padding: 15px; text-align: center;">
                                            <p style="margin: 0; color: #2e7d32; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Completed</p>
                                            <p style="margin: 5px 0 0 0; color: #43a047; font-size: 32px; font-weight: bold;">{{COMPLETED}}</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 5px 0 0;" width="50%">
                                        <div style="background: linear-gradient(135deg, #fff 0%, #ffebee 100%); border: 1px solid #ffcdd2; border-radius: 8px; padding: 15px; text-align: center;">
                                            <p style="margin: 0; color: #c62828; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">No Shows/Cancelled</p>
                                            <p style="margin: 5px 0 0 0; color: #e53935; font-size: 32px; font-weight: bold;">{{NO_SHOWS_CANCELLED}}</p>
                                        </div>
                                    </td>
                                    <td style="padding: 0 0 0 5px;" width="50%">
                                        <div style="background: linear-gradient(135deg, #fff 0%, #e3f2fd 100%); border: 1px solid #90caf9; border-radius: 8px; padding: 15px; text-align: center;">
                                            <p style="margin: 0; color: #1565c0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total Revenue</p>
                                            <p style="margin: 5px 0 0 0; color: #1976d2; font-size: 32px; font-weight: bold;">${{TOTAL_REVENUE}}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Deposits Note -->
                            <div style="background-color: #fff3f7; border-left: 3px solid #ec407a; padding: 10px 15px; margin-top: 20px; border-radius: 4px;">
                                <p style="margin: 0; color: #880e4f; font-size: 14px;">
                                    💳 <strong>{{DEPOSITS}}</strong> deposits collected today
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Staff Performance -->
                    <tr>
                        <td style="padding: 0 30px 30px;">
                            <h2 style="color: #ec407a; font-size: 20px; margin: 0 0 20px 0; font-weight: 500;">
                                Staff Performance
                            </h2>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #fce4ec; border-radius: 8px; overflow: hidden;">
                                <thead>
                                    <tr style="background-color: #fce4ec;">
                                        <th style="padding: 12px; text-align: left; color: #880e4f; font-weight: 600; font-size: 14px;">Staff Member</th>
                                        <th style="padding: 12px; text-align: center; color: #880e4f; font-weight: 600; font-size: 14px;">Appointments</th>
                                        <th style="padding: 12px; text-align: right; color: #880e4f; font-weight: 600; font-size: 14px;">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{STAFF_ROWS}}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Service Breakdown -->
                    <tr>
                        <td style="padding: 0 30px 30px;">
                            <h2 style="color: #ec407a; font-size: 20px; margin: 0 0 20px 0; font-weight: 500;">
                                Service Categories
                            </h2>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                {{SERVICE_CATEGORIES}}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Tomorrow Preview -->
                    <tr>
                        <td style="padding: 0 30px 30px;">
                            <div style="background: linear-gradient(135deg, #fce4ec 0%, #fff3f7 100%); border-radius: 8px; padding: 20px;">
                                <h3 style="color: #880e4f; font-size: 18px; margin: 0 0 15px 0; font-weight: 500;">
                                    📆 Tomorrow's Schedule Preview
                                </h3>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="33%" style="text-align: center; padding: 10px;">
                                            <p style="margin: 0; color: #880e4f; font-size: 12px;">BOOKINGS</p>
                                            <p style="margin: 5px 0 0 0; color: #ec407a; font-size: 24px; font-weight: bold;">{{TOMORROW_BOOKINGS}}</p>
                                        </td>
                                        <td width="33%" style="text-align: center; padding: 10px; border-left: 1px solid #f8bbd0; border-right: 1px solid #f8bbd0;">
                                            <p style="margin: 0; color: #880e4f; font-size: 12px;">FIRST</p>
                                            <p style="margin: 5px 0 0 0; color: #ec407a; font-size: 18px; font-weight: 500;">{{FIRST_APPOINTMENT}}</p>
                                        </td>
                                        <td width="33%" style="text-align: center; padding: 10px;">
                                            <p style="margin: 0; color: #880e4f; font-size: 12px;">LAST</p>
                                            <p style="margin: 5px 0 0 0; color: #ec407a; font-size: 18px; font-weight: 500;">{{LAST_APPOINTMENT}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #880e4f; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 300;">
                                Dermal Skin Care & Spa
                            </p>
                            <p style="margin: 0 0 5px 0; color: #f8bbd0; font-size: 14px;">
                                📍 Tamuning, Guam
                            </p>
                            <p style="margin: 0 0 5px 0; color: #f8bbd0; font-size: 14px;">
                                📞 (671) 647-7546
                            </p>
                            <p style="margin: 0; color: #f8bbd0; font-size: 14px;">
                                ✉️ happyskinhappyyou@gmail.com
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #ad1457; margin: 20px 0;">
                            
                            <p style="margin: 0; color: #f8bbd0; font-size: 12px;">
                                This report was {{REPORT_TYPE}} at {{TIMESTAMP}}
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

// Replace all placeholders with actual data
const finalHtml = htmlTemplate
  .replace('{{DATE}}', formatDate(reportData.date))
  .replace('{{TOTAL_APPOINTMENTS}}', overview.totalAppointments)
  .replace('{{COMPLETED}}', overview.completed)
  .replace('{{NO_SHOWS_CANCELLED}}', overview.noShows + overview.cancelled)
  .replace('{{TOTAL_REVENUE}}', formatCurrency(overview.totalRevenue))
  .replace('{{DEPOSITS}}', overview.depositsCollected)
  .replace('{{STAFF_ROWS}}', staffRowsHtml)
  .replace('{{SERVICE_CATEGORIES}}', serviceCategoriesHtml)
  .replace('{{TOMORROW_BOOKINGS}}', tomorrowPreview.totalBookings)
  .replace('{{FIRST_APPOINTMENT}}', tomorrowPreview.firstAppointment || 'N/A')
  .replace('{{LAST_APPOINTMENT}}', tomorrowPreview.lastAppointment || 'N/A')
  .replace('{{REPORT_TYPE}}', webhookData.automated ? 'automatically generated' : 'manually sent')
  .replace('{{TIMESTAMP}}', formatTimestamp(webhookData.timestamp));

// Return the formatted email data
return {
  json: {
    recipient: webhookData.recipient_email,
    subject: `Daily Report - ${formatDate(reportData.date)} - Dermal Skin Care & Spa`,
    htmlBody: finalHtml,
    reportDate: reportData.date,
    isTest: webhookData.test || false,
    metadata: {
      totalRevenue: overview.totalRevenue,
      totalAppointments: overview.totalAppointments,
      completed: overview.completed
    }
  }
};