# Pinova Mail System MVP

Elite cold outreach at scale with personalization and deliverability-first approach.

## Features

✅ **Core MVP Features:**
- **Sequencer**: Multi-step email sequences with conditions (if opened/replied/bounced)
- **Personalization**: Variable replacement ({{first_name}}, {{company}}, {{city}}, etc.)
- **Amazon SES Integration**: Professional email sending with tracking
- **Deliverability Controls**: Rate limiting, mailbox rotation, daily caps
- **Tracking**: Open/click tracking with pixel and link redirector
- **Dashboard**: Real-time campaign statistics and performance metrics
- **CRM Elements**: Prospect management, campaign tracking, suppression lists

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Email Service**: Amazon SES
- **Tracking**: Custom pixel + redirector
- **Scheduling**: Built-in cron endpoints

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- AWS account with SES configured
- Domain with proper DNS records (SPF, DKIM, DMARC)

### 2. Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
```

### 3. Environment Configuration

Edit `.env.local`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/pinova-mail

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Authentication
JWT_SECRET=your_jwt_secret_here_change_in_production

# Tracking
TRACKING_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. GoDaddy Email Setup

1. **Get your GoDaddy email credentials**:
   - SMTP Host: `smtpout.secureserver.net`
   - SMTP Port: `587` (TLS) or `465` (SSL)
   - Username: Your full email address
   - Password: Your email password

2. **Configure DNS records for better deliverability**:
   - **SPF record**: `v=spf1 include:secureserver.net ~all`
   - **DKIM**: Contact GoDaddy support to enable DKIM
   - **DMARC**: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

### 5. Database Setup

Start MongoDB and the database will be automatically initialized on first run.

### 6. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to access the application.

## Usage Guide

### 1. Set Up Mailboxes

1. Go to `/mailboxes`
2. Add your verified SES email addresses
3. Configure daily sending limits (start with 10-20/day for new domains)
4. Set status to 'active' when ready

### 2. Import Prospects

1. Go to `/prospects`
2. Add prospects manually or import CSV
3. Include required fields: email, firstName
4. Add personalization data: company, city, neighborhood, etc.

### 3. Create Campaigns

1. Go to `/campaigns/new`
2. Set up your email sequence with multiple steps
3. Use personalization variables: `{{first_name}}`, `{{company}}`, etc.
4. Configure timing and conditions
5. Select mailboxes and prospects
6. Start campaign when ready

### 4. Monitor Performance

1. Check `/dashboard` for overview statistics
2. View individual campaign performance
3. Monitor delivery rates, opens, clicks, and replies
4. Track mailbox reputation scores

## Automation Setup

### Cron Job for Sequence Processing

Set up a cron job to process sequences every 5-10 minutes:

```bash
# Add to crontab
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences -H "Authorization: Bearer your_cron_secret_here"
```

Or use a service like GitHub Actions, Vercel Cron, or similar.

## Email Templates

The system supports rich personalization:

```
Subject: Quick question about {{neighborhood}}

Hi {{first_name}},

I noticed you're in the {{neighborhood}} area and wanted to reach out about a unique opportunity in your market.

{{company}} has been doing amazing work in {{city}}, and I thought you'd be interested in hearing about our latest project.

Would you be open to a brief chat this week?

Best regards,
[Your name]
```

## Deliverability Best Practices

1. **Warm up new domains**: Start with 10 emails/day, increase gradually
2. **Monitor bounce rates**: Keep under 2%
3. **Watch spam complaints**: Keep under 0.1%
4. **Use proper authentication**: SPF, DKIM, DMARC all configured
5. **Segment your lists**: Different campaigns for different audiences
6. **Respect opt-outs**: Automatic suppression list management

## API Endpoints

- `GET /api/dashboard` - Dashboard statistics
- `GET/POST /api/campaigns` - Campaign management
- `GET/POST /api/prospects` - Prospect management
- `GET/POST /api/mailboxes` - Mailbox management
- `GET /api/track/open/[trackingId]` - Email open tracking
- `POST /api/cron/process-sequences` - Process email sequences

## Monitoring & Alerts

The system tracks:
- Delivery rates by ISP
- Open and click rates
- Bounce and complaint rates
- Mailbox reputation scores
- Daily sending limits

## Security Features

- Email suppression lists
- Bounce and complaint handling
- Rate limiting per mailbox/ISP
- Secure environment variable handling
- Input validation and sanitization

## Next Steps for Production

1. **Set up monitoring**: Implement error logging and alerting
2. **Add authentication**: User management and multi-tenancy
3. **Scale infrastructure**: Load balancing, Redis for queuing
4. **Advanced features**: AI content generation, A/B testing
5. **Compliance**: GDPR/CCPA data handling, opt-out management

## Support

For issues or questions, check the logs in the browser console and server output. Make sure all environment variables are properly configured and AWS SES is set up correctly.

## License

Private - Pinova Technologies
