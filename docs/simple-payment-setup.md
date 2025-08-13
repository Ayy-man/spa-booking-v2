# Simple Payment Setup Guide

## Overview

The Dermal Spa booking system now uses a simplified URL parameter-based payment confirmation flow. This approach eliminates the need for complex webhooks, signatures, and intricate setup configurations.

## Payment Flow

The simplified payment process follows these steps:

1. **Booking Created**: Customer completes the booking form
2. **Payment Link**: System generates GHL payment link for the booking
3. **Payment Processing**: Customer clicks payment link and completes payment on GHL
4. **Redirect**: After successful payment, GHL redirects to our confirmation URL
5. **Status Update**: System automatically marks booking as paid based on URL parameters

## GHL Payment Link Configuration

To set up payment links in GoHighLevel (GHL):

### Redirect URL Setup

Configure your GHL payment link with this redirect URL:

```
https://dermal-spa-booking.vercel.app/booking/confirmation?payment=success
```

**Note**: The old `/booking/payment-processing` URL will automatically redirect to the new confirmation page for backward compatibility.

### Key Benefits

- **No Webhooks Required**: No need to configure webhook endpoints or handle webhook signatures
- **No Complex Setup**: Simple URL parameter detection handles payment confirmation
- **Reliable**: Direct redirect from payment processor ensures immediate confirmation
- **Secure**: Payment validation happens on GHL's secure platform

## Technical Implementation

### URL Parameter Detection

The system monitors for the following URL parameter:
- `payment_status=success` - Indicates successful payment completion

### Automatic Status Updates

When a user is redirected to the confirmation page with `payment_status=success`:

1. System extracts the success parameter
2. Automatically marks the associated booking as paid
3. Triggers confirmation notifications
4. Updates booking status in the database

### Error Handling

If payment fails or is cancelled:
- User can retry payment using the same payment link
- Booking remains in "pending payment" status
- No automatic status changes occur without success parameter

## Setup Checklist

- [ ] Configure GHL payment link redirect URL
- [ ] **IMPORTANT**: Set redirect to "Open in Existing tab" (not new tab)
- [ ] Test payment flow end-to-end
- [ ] Verify booking status updates correctly
- [ ] Confirm notification emails are sent

## Testing the Setup

1. Create a test booking
2. Complete payment using the generated GHL link
3. Verify redirect to confirmation page with success parameter
4. Check that booking status is updated to "paid"
5. Confirm notification emails are sent

## Troubleshooting

### "Booking session expired" Error
This happens when the booking ID can't be found. Common causes:
- Payment page opened in a new tab (must use "Open in Existing tab" in GHL)
- Browser blocked cookies/storage
- Session expired (after 1 hour)
- Using incognito/private browsing mode

**Solution**: Configure GHL to "Open in Existing tab" for the redirect

### Payment Not Marked as Paid
- Verify the redirect URL is configured correctly in GHL
- Check that the success parameter is present in the redirect URL
- Ensure the booking exists in the system before payment

### Redirect Issues
- Confirm the redirect URL matches exactly: `https://dermal-spa-booking.vercel.app/booking/confirmation?payment=success`
- Check that GHL payment link is configured with the correct redirect URL
- Legacy URL `/booking/payment-processing` will auto-redirect to the new confirmation page

## Support

For issues with this payment setup:
1. Verify GHL configuration matches this documentation
2. Test the complete flow from booking creation to payment confirmation
3. Check system logs for any processing errors

This simplified approach provides a reliable, maintainable payment confirmation system without the complexity of webhook management.