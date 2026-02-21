import { GET as inboxMonitorGet } from '../inbox-monitor/route.js';

// Backward-compat alias for existing cron configuration.
export const maxDuration = 300;
export const GET = inboxMonitorGet;
