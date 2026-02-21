// DO NOT implement scheduling logic in frontend.
// All execution logic is server-controlled. — PRD §10.14

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Activity, RefreshCcw, ChevronRight, ArrowRight,
  AlertTriangle, Filter, Search
} from 'lucide-react';

// ── Action label mapping (mirrors backend EngineLog `action` field) ──────────
const ACTION_LABELS = {
  initial_send:             '📤 Initial email sent',
  followup_send:            '📤 Follow-up sent',
  reply_detected:           '📥 Reply received',
  reply_classified:         '🧠 Reply classified',
  ai_reply_sent:            '🤖 AI reply sent',
  objection_handled:        '💬 Objection handled',
  cooling_triggered:        '❄️  Cooling cycle triggered',
  retry_scheduled:          '🔁 Retry scheduled (backoff)',
  hard_stopped:             '🛑 Hard stopped',
  skipped_rate_limit:       '⏳ Skipped — rate limit',
  skipped_business_hours:   '🕐 Skipped — outside hours',
  skipped_lock:             '🔒 Skipped — lock active',
  corruption_repaired:      '🔧 Corrupted state repaired',
  skipped_mailbox_inactive: '⚠️  Mailbox inactive',
};

const STATE_COLORS = {
  new:               'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  contacted:         'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  opened:            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  replied_positive:  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  replied_neutral:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  replied_objection: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  bounced:           'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  completed:         'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  failed:            'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  stopped:           'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function StatePill({ state }) {
  if (!state) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATE_COLORS[state] ?? 'bg-slate-100 text-slate-600'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function LogEntry({ log }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(log.timestamp);
  const action = ACTION_LABELS[log.action] || log.action;
  const hasDetail = log.error || log.angleKey || log.nextActionAtAfter || log.replyIntent;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 py-2.5 px-4 text-left transition-colors ${hasDetail ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer' : 'cursor-default'}`}
      >
        {/* Time */}
        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 w-36">
          {ts.toLocaleDateString()} {ts.toLocaleTimeString()}
        </span>

        {/* Action */}
        <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{action}</span>

        {/* State transition */}
        {log.stateBefore && log.stateAfter && log.stateBefore !== log.stateAfter && (
          <span className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <StatePill state={log.stateBefore} />
            <ArrowRight className="h-3 w-3 text-slate-300" />
            <StatePill state={log.stateAfter} />
          </span>
        )}

        {/* Error indicator */}
        {log.error && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}

        {/* Expand chevron */}
        {hasDetail && (
          <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
        )}
      </button>

      {open && hasDetail && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs font-mono space-y-1">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {log.angleKey      && <><span className="text-slate-400">Angle:</span><span>[{log.angleIndex}] {log.angleKey}</span></>}
            {log.escalationLevel != null && <><span className="text-slate-400">Escalation:</span><span>Level {log.escalationLevel}</span></>}
            {log.nextActionAtBefore && <><span className="text-slate-400">Was scheduled:</span><span>{new Date(log.nextActionAtBefore).toLocaleString()}</span></>}
            {log.nextActionAtAfter  && <><span className="text-slate-400">Now scheduled:</span><span>{new Date(log.nextActionAtAfter).toLocaleString()}</span></>}
            {log.replyIntent        && <><span className="text-slate-400">Intent:</span><span>{log.replyIntent}</span></>}
            {log.replyObjectionType && <><span className="text-slate-400">Objection:</span><span>{log.replyObjectionType}</span></>}
            {log.failureCount != null && <><span className="text-slate-400">Failure count:</span><span>{log.failureCount}</span></>}
          </div>
          {log.error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-red-600 dark:text-red-400 break-all">
              ⚠ {log.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 50;

export default function V2EngineLogsTab({ campaignId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from EngineLog via our existing query — we hit the debug endpoint without leadId
      // to get campaign-wide logs (we need a campaign-level engine logs endpoint)
      const res = await fetch(`/api/campaigns/${campaignId}/v2-logs?limit=${PAGE_SIZE}`);
      if (res.status === 404) {
        // Endpoint may not exist yet — show empty gracefully
        setLogs([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Filter client-side
  const filtered = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.stateBefore?.includes(q) ||
        log.stateAfter?.includes(q) ||
        log.error?.toLowerCase().includes(q) ||
        log.angleKey?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const repliesReceived = logs.filter(l => l.action === 'reply_detected').length;
  const aiRepliesSent = logs.filter(l => l.action === 'ai_reply_sent').length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="pl-8 h-8 text-sm bg-white/60 dark:bg-slate-900/40"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-8 w-44 text-xs bg-white/60 dark:bg-slate-900/40">
            <Filter className="h-3 w-3 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="h-8 gap-1.5 text-xs flex-shrink-0">
          <RefreshCcw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> {logs.length} entries</span>
        <span className="flex items-center gap-1.5 text-blue-500">📥 {repliesReceived} replies received</span>
        <span className="flex items-center gap-1.5 text-violet-500">🤖 {aiRepliesSent} AI replies sent</span>
        {logs.filter(l => l.error).length > 0 && (
          <span className="flex items-center gap-1.5 text-red-500">
            <AlertTriangle className="h-3 w-3" /> {logs.filter(l => l.error).length} errors
          </span>
        )}
        {filtered.length !== logs.length && (
          <span className="text-slate-400">Showing {filtered.length} filtered</span>
        )}
      </div>

      {/* Log list */}
      <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {logs.length === 0
                ? 'No engine logs yet. Activate the campaign to see entries here.'
                : 'No results matching your filter.'}
            </p>
          </div>
        ) : (
          filtered.map((log, i) => <LogEntry key={i} log={log} />)
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Showing latest {PAGE_SIZE} entries. Engine logs every state transition and skip reason.
      </p>
    </div>
  );
}
