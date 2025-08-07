# Security Best Practices Guide

## Overview
This document outlines security best practices for the Spa Booking System. All security measures have been implemented in a **non-breaking** manner to ensure system stability.

## 🛡️ Current Security Infrastructure

### 1. Input Validation (`/src/lib/validation/booking-schemas.ts`)
- **Zod schemas** validate all user inputs
- **XSS prevention** through character filtering
- **SQL injection detection** (logging only, non-blocking)
- **Phone/email format** validation

**Usage Example:**
```typescript
import { validateBookingRequest } from '@/lib/validation/booking-schemas'

try {
  const validatedData = validateBookingRequest(requestBody)
  // Proceed with validated data
} catch (error) {
  // Handle validation error
}
```

### 2. Rate Limiting (`/src/lib/security/rate-limiter.ts`)
- **Authentication**: 5 attempts per 15 minutes
- **API calls**: 60 requests per minute
- **Bookings**: 10 per hour per IP
- **Walk-ins**: 3 per 5 minutes

**Implementation:**
```typescript
import { withRateLimit, apiRateLimiter } from '@/lib/security/rate-limiter'

const rateLimitResponse = await withRateLimit(req, apiRateLimiter)
if (rateLimitResponse) return rateLimitResponse
```

### 3. Security Headers (`/src/lib/security/security-headers.ts`)
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: XSS protection for older browsers
- **CSP Report-Only**: Content Security Policy monitoring

### 4. Sanitization (`/src/lib/security/sanitization.ts`)
- **String sanitization**: Removes dangerous characters
- **Email/phone cleaning**: Format validation and sanitization
- **SQL identifier safety**: Prevents injection in dynamic queries
- **HTML escaping**: Prevents XSS in user content

### 5. Monitoring (`/src/lib/monitoring/api-logger.ts`)
- **Request logging**: All API calls tracked
- **Security events**: Suspicious patterns logged
- **Performance metrics**: Response times monitored
- **Error tracking**: Centralized error handling

## 🔐 Security Checklist for Developers

### ✅ When Adding New API Endpoints

1. **Always validate input**:
```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email()
})

const validated = schema.parse(requestBody)
```

2. **Apply rate limiting**:
```typescript
const rateLimitResponse = await withRateLimit(req, apiRateLimiter)
if (rateLimitResponse) return rateLimitResponse
```

3. **Use error handler**:
```typescript
import { asyncHandler } from '@/lib/error-handler'

export const POST = asyncHandler(async (req) => {
  // Your code here
})
```

4. **Add logging**:
```typescript
import { withAPILogging } from '@/lib/monitoring/api-logger'

export const POST = withAPILogging(handler)
```

### ✅ When Handling User Input

1. **Never trust user input**
2. **Always sanitize**:
```typescript
import { sanitizeString, sanitizeEmail } from '@/lib/security/sanitization'

const cleanName = sanitizeString(userInput.name)
const cleanEmail = sanitizeEmail(userInput.email)
```

3. **Check for malicious patterns**:
```typescript
import { detectSQLInjection, detectXSS } from '@/lib/security/sanitization'

if (detectSQLInjection(input) || detectXSS(input)) {
  // Log security event (don't block to avoid breaking functionality)
  console.warn('Suspicious input detected')
}
```

### ✅ When Storing Data

1. **Use parameterized queries** (Supabase does this automatically)
2. **Validate data types**
3. **Limit field lengths**
4. **Escape special characters**

### ✅ When Displaying Data

1. **Always escape HTML**:
```typescript
import { escapeHTML } from '@/lib/security/sanitization'

const safeContent = escapeHTML(userContent)
```

2. **Use React's built-in XSS protection**
3. **Avoid `dangerouslySetInnerHTML`**
4. **Sanitize URLs**

## 🚨 Security Event Response

### If You Detect Suspicious Activity:

1. **Log the event** (don't break functionality):
```typescript
logSecurityEvent(req, SecurityEvent.SUSPICIOUS_PATTERN, {
  details: 'Description of suspicious activity'
})
```

2. **Continue normal operation** (non-breaking approach)
3. **Review logs later** in Security Monitor
4. **Block IP if necessary** (manual action)

### Common Attack Patterns to Watch For:

- **SQL Injection**: `' OR '1'='1`, `DROP TABLE`, `UNION SELECT`
- **XSS**: `<script>`, `javascript:`, `onerror=`
- **Path Traversal**: `../`, `..\\`
- **Command Injection**: `;`, `|`, `&&`

## 📊 Security Monitoring

### Access the Security Dashboard
Navigate to `/admin/security-monitor` to view:
- Request metrics
- Blocked attempts
- Suspicious activities
- Failed logins
- Recent security alerts

### What to Monitor:
- **Spike in failed logins**: Potential brute force
- **Unusual request patterns**: Potential bot activity
- **High error rates**: Potential attack or bug
- **Blocked requests**: Attack attempts

## 🔄 Gradual Security Enhancement

### Current Status (Non-Breaking):
- ✅ Input validation (logging only)
- ✅ Rate limiting (configurable)
- ✅ Security headers (permissive)
- ✅ Monitoring (passive)
- ✅ Sanitization utilities (available)

### Future Enhancements (May Break Things):
- ⏳ JWT authentication (replaces hardcoded auth)
- ⏳ Strict CSP (may block some resources)
- ⏳ IP whitelisting (restricts access)
- ⏳ 2FA implementation (changes login flow)
- ⏳ Database encryption (performance impact)

## 🛠️ Testing Security

### Manual Testing:
1. Try SQL injection in forms: `' OR '1'='1`
2. Try XSS: `<script>alert('XSS')</script>`
3. Check rate limiting: Rapid requests
4. View security logs: Check console

### Automated Testing:
```bash
# Run security tests (when implemented)
npm run test:security

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## 📚 Additional Resources

### Security Libraries Used:
- **zod**: Schema validation
- **Rate limiting**: Custom implementation
- **Monitoring**: Custom logger
- **Sanitization**: Custom utilities

### External Services (Future):
- **Sentry**: Error tracking
- **Cloudflare**: DDoS protection
- **Auth0/Supabase Auth**: Authentication
- **Stripe**: Secure payments

## ⚠️ Important Notes

1. **All security measures are NON-BREAKING** - they log issues but don't block functionality
2. **Gradual migration** - Move to stricter security over time
3. **Monitor before blocking** - Understand patterns before enforcing rules
4. **Test thoroughly** - Ensure security doesn't break user experience
5. **Keep credentials secure** - Never commit secrets to git

## 🔑 Current Security Vulnerabilities (To Be Fixed)

### Critical (Fix ASAP):
- Hardcoded admin credentials (`admin@spa.com / dermal123`)
- LocalStorage session management
- No JWT implementation

### Medium Priority:
- No CAPTCHA on forms
- No 2FA for admin
- Limited audit logging

### Low Priority:
- No CSP enforcement
- No HSTS header
- No certificate pinning

## 📞 Security Incident Response

If you discover a security issue:
1. **Don't panic**
2. **Document the issue**
3. **Check logs for exploitation**
4. **Apply temporary fix if possible**
5. **Plan permanent solution**
6. **Test thoroughly**
7. **Deploy carefully**

Remember: **Security is a journey, not a destination**. We're building it gradually without breaking the system.