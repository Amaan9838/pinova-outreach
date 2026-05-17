import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { InboxMonitorService } from '../lib/inbox-monitor.js';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const POLL_INTERVAL_MS = Number(process.env.INBOX_WORKER_INTERVAL_MS || 60000);
const MAILBOX_LIMIT = Number(process.env.INBOX_WORKER_MAILBOX_LIMIT || 0);
const RUN_PARALLEL = process.env.INBOX_WORKER_PARALLEL !== 'false';

let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce() {
  const startedAt = Date.now();
  console.log(`[inbox-worker] Tick started at ${new Date().toISOString()}`);

  await InboxMonitorService.checkReplies({
    limit: MAILBOX_LIMIT > 0 ? MAILBOX_LIMIT : undefined,
    parallel: RUN_PARALLEL
  });

  const durationMs = Date.now() - startedAt;
  console.log(`[inbox-worker] Tick finished in ${durationMs}ms`);
}

async function main() {
  console.log('[inbox-worker] Starting Pinova inbox worker');
  console.log(`[inbox-worker] interval=${POLL_INTERVAL_MS}ms parallel=${RUN_PARALLEL} mailboxLimit=${MAILBOX_LIMIT || 'all'}`);

  while (!shuttingDown) {
    try {
      await runOnce();
    } catch (error) {
      console.error('[inbox-worker] Tick failed:', error?.message || error);
    }

    if (!shuttingDown) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await mongoose.disconnect().catch(() => {});
  console.log('[inbox-worker] Stopped');
}

process.on('SIGINT', () => {
  console.log('[inbox-worker] SIGINT received, stopping after current tick');
  shuttingDown = true;
});

process.on('SIGTERM', () => {
  console.log('[inbox-worker] SIGTERM received, stopping after current tick');
  shuttingDown = true;
});

main().catch((error) => {
  console.error('[inbox-worker] Fatal error:', error);
  process.exitCode = 1;
});
