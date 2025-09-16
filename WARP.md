# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Pinova Mail System is an elite cold outreach platform built with Next.js 14 and MongoDB. The system manages multi-step email sequences with advanced personalization, deliverability controls, and comprehensive tracking capabilities.

**Core Architecture:**
- **Frontend:** Next.js 14 with Tailwind CSS and Radix UI components
- **Backend:** Next.js API Routes with MongoDB/Mongoose
- **Email Delivery:** Amazon SES + custom SMTP with tracking
- **Scheduling:** Built-in cron endpoints for sequence processing

## Essential Development Commands

### Setup & Development
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build && npm start
```

### Testing & Quality Assurance
```bash
# Run all tests
npm test

# Specific test suites
npm run test:api          # API integration tests
npm run test:schema       # Database schema validation
npm run test:coverage     # Generate coverage report
npm run test:watch        # Watch mode for development

# Schema & Performance Validation
npm run validate-schema   # Validate database schemas
npm run check-performance # Performance analysis
npm run error-report      # Error analysis (last 7 days)
```

### Code Quality
```bash
# Lint code
npm run lint
```

## Core Architecture Components

### Database Models & Relationships

**Primary Models:**
- `Campaign`: Core outreach campaigns with sequence steps, scheduling settings, and follow-up configurations
- `Prospect`: Contact data with personalization fields and custom field support
- `Message`: Email messages with tracking events and threading support
- `Mailbox`: SMTP/SES mailbox configurations with daily limits and rotation
- `ScheduledEmail`: Automated scheduling system for sequence execution

**Key Schema Patterns:**
- Campaign has nested `schedule.settings` for email timing/delays
- Message events array tracks delivery lifecycle (`sent`, `delivered`, `opened`, `replied`, `bounced`)
- Prospect custom fields use flexible schema for unlimited personalization data
- Mailbox rotation uses daily limits with automatic reset

### API Architecture

**API Structure:** `/app/api/[resource]/[...params]/route.js`

**Core Endpoints:**
- `/api/campaigns` - Campaign CRUD with schedule/follow-up settings
- `/api/prospects` - Contact management with bulk import
- `/api/mailboxes` - Email account configuration
- `/api/dashboard` - Performance analytics and stats
- `/api/cron/process-sequences` - Automated sequence execution
- `/api/track/open/[trackingId]` - Email open tracking pixel

**API Wrapper System:**
All APIs use enhanced wrappers in `lib/apiWrapper.js` providing:
- Automatic error handling and logging
- Performance monitoring
- Consistent error responses
- Database validation with user-friendly messages

### Email Processing Pipeline

**Sequence Processing Flow:**
1. `lib/sequencer.js` - Main sequence processor for immediate email sending
2. `lib/smtp.js` - SMTP service with SES integration and tracking

**Critical Processing Logic:**
- Campaigns send emails immediately when prospects are added
- Mailbox rotation for load balancing
- Follow-up conditions (opened/replied/bounced) control sequence flow
- Thread management maintains conversation context

### Frontend Components

**Component Structure:** `/components/` and `/app/mcp-shadcn/`

**Key Components:**
- `EnhancedCSVImport.jsx` - Bulk prospect import with field mapping
- `FieldMappingModal.jsx` - Dynamic field mapping interface
- `MultiEmailInput.jsx` - Multiple email input handling
- `CampaignControls.jsx` - Campaign management and control interface

**UI System:** Radix UI + Tailwind with custom design system in `components.json`

## Development Patterns

### Error Handling & Monitoring

The system includes comprehensive error monitoring via `lib/errorMonitor.js` and `lib/performanceMonitor.js`:

- All errors are automatically categorized (Database, API, Email, Auth, Validation)
- Performance tracking identifies slow operations (>2s threshold)
- Error trends provide actionable recommendations
- Critical errors trigger immediate alerts

### Database Schema Management

**Schema Consistency:** The system prevents "Cast to Object failed" errors through:
- Pre-deployment schema validation (`npm run validate-schema`)
- Automated testing of all schema structures
- Migration scripts for schema changes in `/lib/migrations/DataMigration.js`

**Simplified Schema Pattern:**
```javascript
// Scheduling system has been removed - campaigns now use immediate sending
campaign.status // 'draft', 'active', 'paused', 'completed'
campaign.prospects[].status // 'active', 'completed', 'stopped'
```

### Testing Strategy

**Infrastructure Components:**
- API integration tests prevent schema mismatches
- Performance monitoring identifies bottlenecks
- Error analysis provides daily reports
- Pre-commit hooks run validation automatically

**Test Files Location:** `/tests/` directory with setup in `/tests/setup/`

## Environment Configuration

**Required Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/pinova-mail

# AWS SES
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Authentication
JWT_SECRET=your_jwt_secret_here_change_in_production

# Tracking
TRACKING_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Automation & Deployment

### Cron Job Setup
Set up sequence processing every 5-10 minutes:
```bash
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences
```

### Performance Monitoring
- Database queries >2s are flagged
- Memory usage tracking prevents leaks
- API response times monitored
- Automatic bottleneck detection

### Deliverability Best Practices
- Warm up new domains (start 10 emails/day)
- Monitor bounce rates (<2%) and spam complaints (<0.1%)
- Proper SPF, DKIM, DMARC configuration
- Automatic suppression list management

## Key File Paths

**Models:** `/models/Campaign.js`, `/models/Prospect.js`, `/models/Message.js`
**Core Logic:** `/lib/sequencer.js`, `/lib/smtp.js`, `/lib/unifiedFollowupService.js`
**API Routes:** `/app/api/campaigns/`, `/app/api/prospects/`, `/app/api/cron/`
**Components:** `/components/EnhancedCSVImport.jsx`, `/components/CampaignControls.jsx`
**Testing:** `/tests/api/`, `/tests/schema/`, `/scripts/performance-check.js`
**Documentation:** `/docs/DEVELOPMENT-EFFICIENCY-GUIDE.md`, `/docs/TESTING-GUIDE.md`

## Path Aliases

Configure via `jsconfig.json`:
- `@/*` - Root directory
- `@/components/*` - Components directory
- `@/lib/*` - Library functions
- `@/hooks/*` - React hooks
- `@/ui/*` - UI components

## Development Efficiency Notes

The system is designed for proactive error prevention rather than reactive debugging:
- 80% reduction in debugging time through automated validation
- Schema errors caught before deployment
- Performance issues identified proactively
- Error patterns analyzed automatically

**Critical:** Always run `npm run validate-schema` before major changes to prevent schema-related Cast errors.
