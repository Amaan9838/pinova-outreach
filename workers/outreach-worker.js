import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { runOutreachEngineTick } from '../lib/outreachWorkerRunner.js';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const POLL_INTERVAL_MS = Number(process.env.OUTREACH_WORKER_INTERVAL_MS || 60000);
const BATCH_SIZE = Number(process.env.OUTREACH_WORKER_BATCH_SIZE || 100);
const MAX_RUNTIME_MS = Number(process.env.OUTREACH_WORKER_MAX_RUNTIME_MS || 15 * 60 * 1000);
const MIN_GAP_SECONDS = Number(process.env.OUTREACH_WORKER_MIN_GAP_SECONDS || 120);
const MAX_GAP_SECONDS = Number(process.env.OUTREACH_WORKER_MAX_GAP_SECONDS || 240);

let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[outreach-worker] Starting Pinova outreach worker');
  console.log(`[outreach-worker] interval=${POLL_INTERVAL_MS}ms batch=${BATCH_SIZE} gap=${MIN_GAP_SECONDS}-${MAX_GAP_SECONDS}s`);

  while (!shuttingDown) {
    try {
      const result = await runOutreachEngineTick({
        batchSize: BATCH_SIZE,
        maxRuntimeMs: MAX_RUNTIME_MS,
        minGapSeconds: MIN_GAP_SECONDS,
        maxGapSeconds: MAX_GAP_SECONDS
      });
      console.log('[outreach-worker] Tick result:', result);
    } catch (error) {
      console.error('[outreach-worker] Tick failed:', error?.message || error);
    }

    if (!shuttingDown) await sleep(POLL_INTERVAL_MS);
  }

  await mongoose.disconnect().catch(() => {});
  console.log('[outreach-worker] Stopped');
}

process.on('SIGINT', () => {
  console.log('[outreach-worker] SIGINT received, stopping after current tick');
  shuttingDown = true;
});

process.on('SIGTERM', () => {
  console.log('[outreach-worker] SIGTERM received, stopping after current tick');
  shuttingDown = true;
});

main().catch((error) => {
  console.error('[outreach-worker] Fatal error:', error);
  process.exitCode = 1;
});
