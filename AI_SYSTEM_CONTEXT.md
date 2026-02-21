# Pinova Intelligence Outreach Platform: Complete AI System Context

> **ATTENTION AI AGENTS:** This is the **Single Source of Truth** for the entire Pinova Outreach codebase. Read this document heavily before modifying architectural components, database models, or backend logic. It contains critical context on system structure, overlapping legacy code, and known constraints.

---

## 1. High-Level Architecture & Tech Stack

Pinova Intelligence is a modern B2B SaaS platform for Real Estate AI CRM and autonomous outreach.

- **Frontend/Framework**: Next.js 14+ (App Router `app/`), React, Tailwind CSS, Framer Motion (micro-interactions).
- **Backend**: Next.js Route Handlers (`app/api/...`), Node.js (v20+).
- **Database**: MongoDB (Atlas) accessed via Mongoose. Connection managed in `lib/mongodb.js` and `models/`.
- **Authentication**: Custom JWT-based auth (`app/api/auth/...`) with middleware (`middleware.js`) protecting `/dashboard`, `/campaigns`, `/leads`, etc.
- **External APIs**: 
  - **AI Providers**: OpenRouter (Claude Haiku 4.5, Gemini) for generating emails and classifying replies.
  - **Email**: SMTP sending via `nodemailer` (`lib/smtp.js`), IMAP reading via `imap-simple`/`mailparser` (`lib/inbox-monitor.js`).
  - **Google OAuth**: Connected Gmail accounts (Restricted scopes: `gmail.readonly`, `gmail.send`).

---

## 2. Project Layout & Directory Structure

- `app/`: Next.js frontend pages and backend API routes.
  - `app/api/`: Backend REST endpoints.
  - `app/(dashboard)/` or subfolders like `app/campaigns/`: Protected UI routes.
- `components/`: Reusable React UI components (Buttons, Modals, Tables, generic layout).
- `lib/`: **Core Backend Business Logic**.
  - `lib/outreachEngine.js`: The central V2 automated sending system.
  - `lib/inbox-monitor.js`: The IMAP reply detection system.
  - `lib/smtp.js`: The SMTP sender logic.
  - `lib/aiService.js`: Wrappers for reaching out to LLMs.
- `models/`: Mongoose schemas. The blueprint for all MongoDB data.

---

## 3. The Core Database Models (`models/`)

The database architecture relies heavily on junction tables (many-to-many relationships) and state machines.

1. **`User`**: Account owners/agents.
2. **`Mailbox`** (or `MailboxFixed.js`): Represents a connected email account. Contains `smtpConfiguration` (host, port, user, pass) and `imapConfiguration`.
3. **`Prospect`**: The static, global "Lead" data (Name, Email, Phone, Company, linked in). This is the leaf node.
4. **`Campaign`**: An outreach sequence payload. Must have `useV2Engine: true` to function properly. Contains global timing rules (`v2Delays`), AI context (`v2Angles`, `knowledgeBase`, `goal`), and business hours.
5. **`CampaignProspect` (THE MOST IMPORTANT MODEL)**: 
   - The junction between a Campaign and a Prospect.
   - **Crucial Concept**: A lead's *status* within a campaign lives here, not on the `Prospect` object.
   - **State Machine (`v2State`)**: `new` -> `contacted` -> `opened` -> `replied_positive` / `replied_neutral` / `replied_objection` -> `failed` / `bounced` / `unsubscribed`.
   - Contains `emailSteps[]` representing the exact subject/body to send if hardcoded.
   - Contains `nextActionAt` (Date) telling the engine when this lead is ready for the next email.
6. **`Message`**: Represents an individual sent email (or received reply).
   - Tied to `campaignId` and `prospectId`.
   - Must contain `headerMessageId` to maintain standard email threading (Reply-To / References headers).

---

## 4. The Outreach Engine & Background Jobs

All background automation runs via cron endpoints pinged by external schedulers (e.g., Vercel Cron, GitHub Actions, or Upstash).

### A. The V2 Engine (`GET /api/cron/outreach-engine` -> `lib/outreachEngine.js`)
This is the only code path that should send automated emails.
1. **Picks up leads**: Queries `CampaignProspect.findDueForV2()`.
2. **Locks leads**: Uses `processingLock` to prevent parallel cron runs from sending duplicate emails to the same lead.
3. **Determines Content**: 
   - Uses hardcoded `emailSteps` array from CSV import first.
   - Falls back to AI generated content (`generateTargetedEmail`) using the Campaign's `v2Angles` and `knowledgeBase`.
4. **Sends Email**: Routes via `lib/smtp.js`.
5. **Logs Result**: Writes a `Message` document and updates `CampaignProspect.v2State`.

### B. The Reply Monitor (`GET /api/cron/inbox-monitor` -> `lib/inbox-monitor.js`)
1. Connects to `Mailbox` IMAP.
2. Searches for unread emails since yesterday.
3. Matches the sender `From` address against known `Prospect` emails.
4. If found, logs a received `Message` and updates the lead's `repliedAt` timestamp.
5. **NOTE**: The inbox monitor *does not* classify the reply. Next time the `outreachEngine` runs and sees `repliedAt`, it uses an LLM to categorize it as Positive/Neutral/Objection and sends the automated follow-up.

---

## 5. Critical Historical Context & Known Pitfalls (MUST READ)

If you are modifying this codebase, you MUST be aware of the following solved critical bugs to ensure you do not reintroduce them.

### Pitfall A: Legacy vs. V2 Duplicate Logic
**History**: The platform used to have a legacy engine (`lib/campaignScheduling.js`) that used a `status` field (`active`, `paused`). We migrated to the V2 Engine (`lib/outreachEngine.js`) which uses `v2State` (`new`, `contacted`, etc.).
**Rule**: NEVER use or write to the old `status`, `sequenceStep`, or `nextSendAt` fields for logic. They are dead legacy ghosts. Always read/write to `v2State`, `attemptCount`, and `nextActionAt` on `CampaignProspect`.

### Pitfall B: The Unique `trackingId` Crash
**History**: The `Message` model has a `unique: true` database index on `trackingId`. Previously, the engine set `trackingId = lead._id`. Sending a follow-up email to the *same* lead crashed the script because the ID wasn't unique.
**Rule**: `trackingId` must be dynamically generated. In `outreachEngine.js`, it is set to `${lead._id.toString()}-${Date.now()}`. Do not change this mechanism.

### Pitfall C: Strict Mongoose Schema Adherence
**History**: When the Outreach Engine tries to log an SMTP network failure, if it passes incorrect keys to `Message.create()` (e.g. `{ body: "..." }` instead of `{ content: "..." }`), Mongoose throws a `ValidationError`. This crash halts the entire cron loop, leaving leads permanently `processingLock: true`.
**Rule**: Always double-check `models/Message.js` (and other models) before modifying database insert/update calls.

### Pitfall D: Node.js >= 24 Local DNS Bug (`querySrv ECONNREFUSED`)
**History**: Node 24 on Windows environments resolves default DNS to `127.0.0.1`, which fails to resolve `mongodb+srv://` connection strings via `dns.resolveSrv`. 
**Rule**: `next.config.js` has a global override: `const dns = require('dns'); dns.setServers(['8.8.8.8', ...]);`. If you write a standalone test script (`node -e "..."`), it WILL FAIL to connect to MongoDB unless you include that DNS override at the top of the script.

### Pitfall E: SMTP `connect ETIMEDOUT` on Port 465
**History**: Network timeouts when connecting to SMTP servers usually mean the user's firewall, ISP, or hosting provider is blocking outbound connections on standard anti-spam ports (like 465 or 25).
**Rule**: This is usually solved by changing the Campaign/Mailbox settings in the UI to use port `587` (STARTTLS), rather than being a code-level bug in Node.

---

## 6. Testing & Diagnostic Tools

When you need to debug the outreach sequence without waiting for crons, use these endpoints:

1. **V2-Kick Endpoint** (`POST /api/campaigns/[id]/v2-kick`):
   - Resets all leads in a campaign. Sets `processingLock: false` and `nextActionAt: new Date()`. Forces them into the next immediate cron run.
2. **Kick Status Viewer** (`GET /api/campaigns/[id]/v2-kick`):
   - Outputs JSON detailing the exact internal state (`v2State`, `nextActionAt`, `attemptCount`, `failureCount`) of all leads in a campaign so you can see why they are stuck.
3. **Manual Engine Trigger** (`GET /api/cron/outreach-engine`):
   - Fires the global processor immediately.

---

## 7. Code Quality & Philosophy

1. **Idempotency first**: Ensure every database update and email send can handle retries safely (hence the `trackingId` fix and `processingLock`).
2. **Defensive AI**: If OpenAI, Gemini, or Claude goes down, the engine must catch the error, log `failureCount++`, schedule a non-fatal retry, and release the lock. NEVER crash the loop.
3. **Premium UI**: Any frontend changes must adhere to the Pinova dark-mode aesthetic (subtle borders, muted grays, modern typography like Inter/Outfit). Ensure loading states and error toasts are present.

*(End of Single Source of Truth)*
