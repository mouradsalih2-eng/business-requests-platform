# Email Verification (Resend) - Shaping Notes

## Problem Statement

Currently using Nodemailer which requires SMTP configuration and has delivery reliability concerns. Need a production-ready email service for:
- Email verification on user registration
- Future: Status change notifications, release notes distribution

## Key Decisions

### 1. Email Provider
- **Decision**: Resend (https://resend.com)
- **Rationale**:
  - 3,000 emails/month free tier (sufficient for MVP scale)
  - Modern developer-friendly API
  - Better deliverability than raw SMTP
  - Simple SDK integration

### 2. Initial Scope
- **Decision**: Registration verification emails only
- **Rationale**: Solve the immediate need, expand later
- **Future**: Status notifications, @mentions, release notes

### 3. Implementation Approach
- **Decision**: Replace Nodemailer with Resend SDK in `server/src/services/email.js`
- **Rationale**: Minimal code change, same service interface

### 4. Email Templates
- **Decision**: Use Resend React email templates
- **Rationale**: Type-safe, reusable, maintainable templates

## Technical Notes

### Current Implementation Reference
```
server/src/services/email.js - Nodemailer configuration
```

### Resend Integration
```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Verify your email',
  html: verificationTemplate(token)
});
```

### Environment Variables
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM` - Verified sender domain

## Out of Scope (Future)

- Status change notifications
- @mention alerts
- Release notes distribution
- Email preference management
- Custom email templates per project (multi-tenant)

## Dependencies

None - can be implemented independently

## Effort Estimate

Small - SDK swap with minimal code changes
