/**
 * Pinova Outreach - Cron Runner for Windows
 * 
 * This script runs all required cron jobs for the Pinova Outreach system.
 * It replaces the need for external cron services on Windows.
 * 
 * Usage:
 * 1. Make sure your Next.js dev server is running: npm run dev
 * 2. In a separate terminal, run: node scripts/cron-runner.js
 * 3. Keep this running in the background
 */

const BASE_URL = 'http://localhost:3000';

// Simple fetch polyfill for Node.js < 18
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

async function callEndpoint(name, endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✅ ${name} - ${data.message || 'Success'}`, 'green');
      return true;
    } else {
      log(`❌ ${name} - HTTP ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${name} - ${error.message}`, 'red');
    return false;
  }
}

// Job definitions
const jobs = [
  {
    name: 'Process Sequences',
    endpoint: '/api/cron/process-sequences',
    interval: 2 * 60 * 1000, // 2 minutes
    description: 'Sends scheduled emails from active campaigns'
  },
  {
    name: 'Process Scheduled',
    endpoint: '/api/cron/process-scheduled',
    interval: 5 * 60 * 1000, // 5 minutes
    description: 'Activates campaigns scheduled to start'
  },
  {
    name: 'Check Replies',
    endpoint: '/api/cron/check-replies',
    interval: 10 * 60 * 1000, // 10 minutes
    description: 'Monitors mailboxes for replies'
  },
  {
    name: 'AI Follow-ups',
    endpoint: '/api/cron/ai-followups',
    interval: 6 * 60 * 60 * 1000, // 6 hours
    description: 'Generates AI-powered follow-ups for engaged prospects'
  },
  {
    name: 'Process Unified',
    endpoint: '/api/cron/process-unified',
    interval: 30 * 60 * 1000, // 30 minutes
    description: 'System maintenance and background operations'
  }
];

// Start all jobs
function startCronJobs() {
  log('🚀 Pinova Outreach Cron Runner Started', 'blue');
  log(`📡 Server: ${BASE_URL}`, 'blue');
  log('', 'reset');
  
  jobs.forEach(job => {
    log(`⏰ ${job.name} - Every ${job.interval / 60000} minutes`, 'yellow');
    log(`   ${job.description}`, 'gray');
    
    // Run immediately on start
    callEndpoint(job.name, job.endpoint);
    
    // Then run on interval
    setInterval(() => {
      callEndpoint(job.name, job.endpoint);
    }, job.interval);
  });
  
  log('', 'reset');
  log('📊 Monitoring cron jobs... (Press Ctrl+C to stop)', 'blue');
  log('', 'reset');
}

// Health check
async function healthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      log('✅ Server is healthy', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Server is not responding. Make sure "npm run dev" is running!', 'red');
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('', 'reset');
  log('👋 Shutting down cron runner...', 'yellow');
  process.exit(0);
});

// Start
(async () => {
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    log('⚠️  Starting anyway... Will retry on each interval', 'yellow');
  }
  
  log('', 'reset');
  startCronJobs();
})();
