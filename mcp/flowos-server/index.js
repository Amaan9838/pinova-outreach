#!/usr/bin/env node

/**
 * FlowOS MCP Server
 * 
 * Supports two transport modes:
 * - stdio (default) — for Claude Desktop local config
 * - http  — for Claude.ai web connector (Remote MCP URL via ngrok)
 * 
 * Usage:
 *   node index.js              → stdio mode (Claude Desktop)
 *   node index.js --http       → HTTP mode on port 3001 (Claude.ai via ngrok)
 *   TRANSPORT=http node index.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createServer } from 'http';

const API_URL = process.env.FLOWOS_API_URL || 'http://localhost:3000/api/flow';
const HTTP_PORT = parseInt(process.env.PORT || '3001', 10);
const useHttp = process.argv.includes('--http') || process.env.TRANSPORT === 'http';

// ── API helpers ──────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── SOPs ─────────────────────────────────────────────────────

const SOPS = {
  outbound_prospect: {
    name: 'Outbound — Prospect to Campaign', area: 'outbound',
    description: 'Find, qualify, and reach out to a new prospect via cold email campaign.',
    steps: [
      { text: 'Research {name} and their company — website, LinkedIn, team size, tech stack', energy: 'medium' },
      { text: 'Qualify {name} — decision maker? Right company size? Clear need for AI CRM?', energy: 'low' },
      { text: 'Write personalized cold email for {name} — reference their specific pain point', energy: 'medium' },
      { text: 'Create campaign in Pinova for {name}', energy: 'low' },
      { text: 'Add {name} email to campaign and launch', energy: 'low' },
    ],
  },
  outbound_close: {
    name: 'Outbound — Close Deal', area: 'outbound',
    description: 'Convert a positive reply into a paying customer.',
    steps: [
      { text: 'Research {name}\'s current website thoroughly', energy: 'medium' },
      { text: 'Build demo homepage for {name} using base template', energy: 'high' },
      { text: 'Send demo site link to {name} with walkthrough message', energy: 'low' },
      { text: 'Follow up with {name} after 2 days if no response', energy: 'low' },
      { text: 'Schedule call with {name} to discuss demo feedback', energy: 'low' },
      { text: 'Address {name}\'s feedback and make requested changes', energy: 'medium' },
      { text: 'Send final proposal with pricing to {name}', energy: 'medium' },
      { text: 'Follow up on proposal — close or handle objections', energy: 'low' },
    ],
  },
  inbound_lead: {
    name: 'Inbound — Qualify & Convert', area: 'inbound',
    description: 'Someone showed interest. Qualify and move to close.',
    steps: [
      { text: 'Research {name} — their profile, company, and how they found us', energy: 'medium' },
      { text: 'Qualify {name} — right fit? Decision maker? Budget?', energy: 'low' },
      { text: 'Reply to {name} with personalized message — ask about their current pain', energy: 'medium' },
      { text: 'Engage with {name}\'s recent social posts (like, comment meaningfully)', energy: 'low' },
      { text: 'Share relevant case study or resource with {name}', energy: 'low' },
      { text: 'Propose a quick demo call with {name}', energy: 'low' },
    ],
  },
  delivery_onboard: {
    name: 'Delivery — Client Onboarding', area: 'delivery',
    description: 'Onboard a new client — build their site, set up Pinova, launch.',
    steps: [
      { text: 'Research {name}\'s brand, competitors, and target audience deeply', energy: 'high' },
      { text: 'Build client homepage for {name} using template — customize colors, copy, images', energy: 'high' },
      { text: 'Set up {name}\'s Pinova account — mailboxes, domains, warm-up', energy: 'medium' },
      { text: 'Send site draft to {name} for review', energy: 'low' },
      { text: 'Implement {name}\'s revision requests', energy: 'medium' },
      { text: 'Launch {name}\'s site and confirm everything working', energy: 'low' },
      { text: 'Write onboarding email to {name} with docs and next steps', energy: 'medium' },
    ],
  },
  ops_new_mailbox: {
    name: 'Ops — New Mailbox Setup', area: 'ops',
    description: 'Set up a new sending mailbox with proper deliverability.',
    steps: [
      { text: 'Purchase domain for new mailbox', energy: 'low' },
      { text: 'Set up DNS records — SPF, DKIM, DMARC', energy: 'medium' },
      { text: 'Create email account on the domain', energy: 'low' },
      { text: 'Add mailbox to Pinova and connect', energy: 'low' },
      { text: 'Start warm-up sequence (14 days)', energy: 'low' },
      { text: 'Check warm-up after 7 days — inbox rate, spam complaints', energy: 'low' },
      { text: 'Verify deliverability after 14 days — run test sends', energy: 'low' },
    ],
  },
};

// ── Register all tools on an McpServer instance ─────────────
// Factory function — each HTTP session gets its own server

function createFlowOSServer() {
  const server = new McpServer({ name: 'flowos', version: '1.0.0' });

  server.tool(
    'get_system_state',
    `Get the full GTD system overview. Call this FIRST to understand context.`,
    {},
    async () => {
      try {
        const data = await apiGet('/state');
        return { content: [{ type: 'text', text: JSON.stringify(data.state, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'capture',
    `Capture raw thoughts into the GTD inbox. Each line becomes a separate inbox item.`,
    { thoughts: z.string().describe('Raw text. Use newlines to separate multiple items.') },
    async ({ thoughts }) => {
      try {
        const data = await apiPost('/capture', { thoughts });
        return { content: [{ type: 'text', text: `✅ Captured ${data.captured} item(s) into inbox.` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'add_action',
    `Create a specific next action directly (skips inbox). Actions MUST be specific and physical.
Areas: outbound, inbound, delivery, ops
Energy: low (quick win <15min), medium (15-45min), high (deep work 45+min)`,
    {
      text: z.string().describe('The specific, physical next action'),
      area: z.enum(['outbound', 'inbound', 'delivery', 'ops']).nullable().describe('Area of focus'),
      energy: z.enum(['low', 'medium', 'high']).default('medium'),
      projectId: z.string().optional().describe('Project this belongs to'),
      isToday: z.boolean().default(false),
      isPriority: z.boolean().default(false).describe('THE ONE THING for today'),
    },
    async ({ text, area, energy, projectId, isToday, isPriority }) => {
      try {
        await apiPost('/items', {
          item: { text, type: 'action', area, energy, projectId: projectId || null, isToday, isPriority },
        });
        return { content: [{ type: 'text', text: `✅ Action: "${text}" [${area}] [${energy}]${isToday ? ' [TODAY]' : ''}` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'add_project',
    `Create a project (outcome requiring multiple steps). Optionally include the first action.`,
    {
      name: z.string().describe('Project name — the desired outcome'),
      area: z.enum(['outbound', 'inbound', 'delivery', 'ops']).nullable(),
      firstAction: z.string().optional(),
      actionEnergy: z.enum(['low', 'medium', 'high']).default('medium'),
      notes: z.string().optional(),
    },
    async ({ name, area, firstAction, actionEnergy, notes }) => {
      try {
        const projRes = await apiPost('/items', {
          item: { text: name, type: 'project', area, notes: notes || '' },
        });
        const projId = projRes.item?._id || projRes.item?.id;
        let msg = `✅ Project: "${name}"`;
        if (firstAction && projId) {
          await apiPost('/items', {
            item: { text: firstAction, type: 'action', area, energy: actionEnergy, projectId: projId },
          });
          msg += `\n   → First action: "${firstAction}"`;
        }
        return { content: [{ type: 'text', text: msg }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'add_waiting_for',
    `Track something you're waiting on from someone else.`,
    {
      text: z.string(), waitingOn: z.string(),
      area: z.enum(['outbound', 'inbound', 'delivery', 'ops']).nullable(),
      projectId: z.string().optional(),
    },
    async ({ text, waitingOn, area, projectId }) => {
      try {
        await apiPost('/items', {
          item: { text, type: 'waiting', waitingOn, area, projectId: projectId || null, waitingSince: new Date().toISOString() },
        });
        return { content: [{ type: 'text', text: `✅ Waiting for: "${text}" (from ${waitingOn})` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'add_routine',
    `Create a recurring daily habit with streak tracking.`,
    {
      text: z.string(),
      frequency: z.enum(['daily', 'weekdays', 'weekly']).default('daily'),
      area: z.enum(['outbound', 'inbound', 'delivery', 'ops']).nullable(),
      energy: z.enum(['low', 'medium', 'high']).default('low'),
    },
    async ({ text, frequency, area, energy }) => {
      try {
        await apiPost('/items', {
          item: { text, type: 'routine', area, energy, recurrence: { frequency, streak: 0, bestStreak: 0, lastCompletedDate: null } },
        });
        return { content: [{ type: 'text', text: `✅ Routine: "${text}" (${frequency}) 🔗` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'complete_action',
    `Mark an action/waiting done. For routines, increments streak.`,
    { id: z.string(), nextAction: z.string().optional() },
    async ({ id, nextAction }) => {
      try {
        const data = await apiPost('/complete', { id, nextAction });
        let msg = `✅ Completed.`;
        if (data.streak) msg = `✅ Routine done! Streak: ${data.streak} 🔥`;
        if (data.newAction) msg += `\n   → New action: "${data.newAction.text}"`;
        return { content: [{ type: 'text', text: msg }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'get_next_actions',
    `Get pending next actions, optionally filtered.`,
    { area: z.enum(['outbound', 'inbound', 'delivery', 'ops']).optional(), energy: z.enum(['low', 'medium', 'high']).optional() },
    async ({ area, energy }) => {
      try {
        let path = '/items?type=action';
        if (area) path += `&area=${area}`;
        if (energy) path += `&energy=${energy}`;
        const data = await apiGet(path);
        const items = data.items || [];
        if (!items.length) return { content: [{ type: 'text', text: 'No actions found.' }] };
        const formatted = items.map(i => `• [${i.energy}] ${i.text}${i.area ? ` (${i.area})` : ''}${i.isToday ? ' [TODAY]' : ''} — id: ${i._id}`).join('\n');
        return { content: [{ type: 'text', text: `${items.length} actions:\n${formatted}` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'get_projects',
    `Get all active projects with stuck status.`,
    {},
    async () => {
      try {
        const data = await apiGet('/state');
        const projects = data.state?.projects || [];
        if (!projects.length) return { content: [{ type: 'text', text: 'No active projects.' }] };
        const formatted = projects.map(p => `• ${p.name}${p.area ? ` (${p.area})` : ''}\n  → ${p.isStuck ? '⚠️ STUCK!' : p.nextAction}\n  id: ${p.id}`).join('\n\n');
        return { content: [{ type: 'text', text: `${projects.length} projects:\n\n${formatted}` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'flag_for_today',
    `Flag actions for today's focus.`,
    { ids: z.array(z.string()) },
    async ({ ids }) => {
      try {
        for (const id of ids) await apiPatch(`/items/${id}`, { isToday: true });
        return { content: [{ type: 'text', text: `✅ Flagged ${ids.length} action(s) for today.` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.tool(
    'list_sops',
    `List available Standard Operating Procedures.`,
    {},
    async () => {
      const formatted = Object.entries(SOPS).map(([key, sop]) =>
        `**${sop.name}** (key: ${key})\n  ${sop.description}\n  Steps: ${sop.steps.length}`
      ).join('\n\n');
      return { content: [{ type: 'text', text: `Available SOPs:\n\n${formatted}` }] };
    }
  );

  server.tool(
    'start_sop',
    `Start a Standard Operating Procedure — creates a project with all pre-defined actions.
Use when user mentions: new prospect, positive reply, inbound lead, new client, new mailbox.`,
    {
      sopKey: z.enum(['outbound_prospect', 'outbound_close', 'inbound_lead', 'delivery_onboard', 'ops_new_mailbox']),
      name: z.string().describe('Person/company name — replaces {name} in actions'),
      notes: z.string().optional(),
    },
    async ({ sopKey, name, notes }) => {
      try {
        const sop = SOPS[sopKey];
        if (!sop) return { content: [{ type: 'text', text: `Unknown SOP: ${sopKey}` }] };
        const projectName = `${sop.name.split('—')[1]?.trim() || sop.name}: ${name}`;
        const projRes = await apiPost('/items', {
          item: { text: projectName, type: 'project', area: sop.area, notes: `SOP: ${sop.name}\n${notes || ''}`.trim() },
        });
        const projId = projRes.item?._id || projRes.item?.id;
        const actions = sop.steps.map((step, i) => ({
          text: step.text.replace(/\{name\}/g, name), type: 'action', area: sop.area,
          energy: step.energy, projectId: projId, isToday: i === 0,
        }));
        await apiPost('/items', { items: actions });
        return { content: [{ type: 'text', text: `✅ SOP started: "${projectName}"\n${actions.length} actions created. First one flagged for today.` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // Resource
  server.resource(
    'system-context', 'flowos://system-context',
    async () => ({
      contents: [{
        uri: 'flowos://system-context', mimeType: 'text/plain',
        text: `You manage a GTD system for a solopreneur doing B2B SaaS sales for Pinova Intelligence (AI CRM for real estate).

PERSONALITY: No emotions, no expectations. Dump → process → execute → review weekly. Quick wins first → deep work.

AREAS: outbound (prospecting/cold email), inbound (LinkedIn/SEO), delivery (client sites), ops (email deliverability/platform)

ENERGY: low (<15min quick wins), medium (15-45min), high (45+min deep work)

SOPs — use start_sop when user mentions: new prospect, positive reply, inbound lead, new client, new mailbox.

RULES: Actions must be SPECIFIC. Not "work on proposal" → "Write pricing section". Call get_system_state FIRST.`,
      }],
    })
  );

  return server;
}

// ── Start ────────────────────────────────────────────────────

async function main() {
  if (useHttp) {
    // Stateless HTTP mode — each request gets its own server+transport
    // No sessions, no race conditions, works perfectly with Claude.ai
    const httpServer = createServer(async (req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);

      // Health check
      if (url.pathname === '/' || url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', server: 'flowos-mcp', transport: 'http-stateless' }));
        return;
      }

      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found. MCP endpoint is at /mcp');
        return;
      }

      // Stateless mode: only POST is supported (no GET for SSE, no DELETE for sessions)
      if (req.method === 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'SSE not supported in stateless mode. Use POST.' }));
        return;
      }

      if (req.method === 'DELETE') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session termination not supported in stateless mode.' }));
        return;
      }

      try {
        // Fresh server + transport per request — no shared state
        const server = createFlowOSServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless — no sessions
        });

        res.on('close', () => {
          transport.close().catch(() => {});
          server.close().catch(() => {});
        });

        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('MCP HTTP error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      }
    });

    httpServer.listen(HTTP_PORT, () => {
      console.error(`FlowOS MCP Server running on http://localhost:${HTTP_PORT}/mcp (stateless)`);
      console.error(`Health: http://localhost:${HTTP_PORT}/health`);
      console.error(`\nFor Claude.ai → ngrok http ${HTTP_PORT}`);
      console.error(`Then paste: https://<ngrok-id>.ngrok-free.app/mcp`);
    });

  } else {
    // stdio mode for Claude Desktop
    const server = createFlowOSServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('FlowOS MCP Server running on stdio');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
