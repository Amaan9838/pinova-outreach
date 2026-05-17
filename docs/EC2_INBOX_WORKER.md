# Pinova Workers on EC2

Run inbox monitoring and outreach sending outside Vercel so neither replies nor campaign sends are limited by serverless timeouts.

## Environment

Copy the same production environment variables used by the web app:

```bash
MONGODB_URI=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
AUTO_REPLY_TO_PROSPECTS=false
AUTO_REPLY_TEMPLATE_ENABLED=true
```

For testing, keep `AUTO_REPLY_TEMPLATE_ALLOWLIST` set to specific addresses. For production, remove it to allow template replies for every matched prospect reply.

Optional worker controls:

```bash
INBOX_WORKER_INTERVAL_MS=60000
INBOX_WORKER_PARALLEL=true
INBOX_WORKER_MAILBOX_LIMIT=0

OUTREACH_WORKER_INTERVAL_MS=60000
OUTREACH_WORKER_BATCH_SIZE=100
OUTREACH_WORKER_MIN_GAP_SECONDS=120
OUTREACH_WORKER_MAX_GAP_SECONDS=240
```

## Start

```bash
npm install
npm run worker:inbox
npm run worker:outreach
```

## Run With PM2

```bash
npm install -g pm2
pm2 start npm --name pinova-inbox-worker -- run worker:inbox
pm2 start npm --name pinova-outreach-worker -- run worker:outreach
pm2 save
pm2 startup
```

## Notes

- The worker checks active mailboxes continuously.
- It uses each mailbox `lastProcessedUid` checkpoint to avoid reprocessing old mail.
- It sends Telegram/Slack/webhook notifications when configured.
- It sends the fixed template auto-reply only when `AUTO_REPLY_TEMPLATE_ENABLED=true`.
- It is independent of Vercel cron and can run longer than 30 seconds.
- The outreach worker sends due campaign emails with human pacing, so campaigns do not burst from Vercel cron.
