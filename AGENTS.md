# AGENTS.md - Pinova Mail System

⚠️ **CRITICAL**: Before modifying any architectural components, database models, or backend logic, read `AI_SYSTEM_CONTEXT.md` for the single source of truth on system structure, overlapping legacy code, critical pitfalls, and known constraints.

## Build, Lint & Test Commands

```bash
# Development server
npm run dev

# Production build
npm run build && npm start

# Linting
npm run lint

# Testing
npm test                    # Run all tests
npm test -- --testNamePattern="suite name"  # Single test/suite
npm run test:watch         # Watch mode
npm run test:api           # API tests only
npm run test:schema        # Schema tests only

# Scripts
npm run validate-schema     # Validate data schemas
npm run check-performance   # Performance metrics
npm run error-report        # Generate error report
```

## Architecture & Structure

**Frontend:** Next.js 14 (App Router) with React 18, Tailwind CSS, Radix UI  
**Backend:** Next.js API Routes (`/app/api`)  
**Database:** MongoDB + Mongoose (auto-initialized)  
**Email:** Amazon SES for production, SMTP fallback  
**Key Services:**
- `lib/outreachEngine.js` - Core campaign sequencing logic
- `lib/campaignScheduling.js` - Cron & timing orchestration
- `lib/dataAccessLayer.js` - MongoDB queries layer
- `lib/aiService.js` - Anthropic AI integration
- `lib/ses.js` - AWS SES sender

**Path Aliases:** `@/*` (root), `@/components/*`, `@/lib/*`, `@/ui/*` (from jsconfig.json)

## Code Style & Conventions

- **Imports:** ES6 modules (`import/export`); prefer named exports
- **Naming:** camelCase for vars/functions, PascalCase for React components & classes
- **React:** Functional components with hooks; use `/jsx` extension for components
- **Mongoose:** Models in `/models`, imported once in `lib/models.js` before populate/aggregate
- **Errors:** Include error context in logs; use try-catch with meaningful messages
- **Testing:** Jest config at `tests/setup/jest.config.js`; test files use `.test.js`
- **API:** RESTful routes in `/app/api` folder structure; return JSON with consistent error format
- **Config:** Use `.env.local` (required keys: `MONGODB_URI`, `AWS_*`, `JWT_SECRET`, `TRACKING_DOMAIN`)
