// DO NOT implement scheduling logic in frontend.
// All execution logic is server-controlled. — PRD §10.14

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Activity, Clock, Mail, Eye, MessageSquare, AlertTriangle, 
  CheckCircle2, XCircle, Ban, RefreshCcw, Layers, Brain,
  ChevronRight, ArrowRight
} from 'lucide-react';

// ── State display config ───────────────────────────────────────────────────
const STATE_META = {
  new:               { label: 'New',               color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',  icon: Clock },
  contacted:         { label: 'Contacted',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',   icon: Mail },
  opened:            { label: 'Opened',             color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: Eye },
  replied_positive:  { label: 'Replied ✓',          color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400', icon: CheckCircle2 },
  replied_neutral:   { label: 'Replied ~',          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400', icon: MessageSquare },
  replied_objection: { label: 'Objection',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', icon: AlertTriangle },
  bounced:           { label: 'Bounced',            color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',        icon: XCircle },
  completed:         { label: 'Completed',          color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',   icon: CheckCircle2 },
  failed:            { label: 'Failed',             color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',        icon: XCircle },
  stopped:           { label: 'Stopped',            color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',  icon: Ban },
};

const ACTION_LABELS = {
  initial_send:          '📤 Initial email sent',
  followup_send:         '📤 Follow-up sent',
  reply_detected:        '📥 Reply received',
  reply_classified:      '🧠 Reply classified',
  ai_reply_sent:         '🤖 AI reply sent',
  objection_handled:     '💬 Objection handled',
  cooling_triggered:     '❄️  Cooling cycle triggered',
  retry_scheduled:       '🔁 Retry scheduled',
  hard_stopped:          '🛑 Hard stopped',
  skipped_rate_limit:    '⏳ Skipped — rate limit hit',
  skipped_business_hours:'🕐 Skipped — outside hours',
  skipped_lock:          '🔒 Skipped — lock active',
  corruption_repaired:   '🔧 Corrupted state repaired',
  skipped_mailbox_inactive: '⚠️  Mailbox inactive',
};

function StatePill({ state }) {
  const meta = STATE_META[state] || { label: state, color: 'bg-slate-100 text-slate-600', icon: Activity };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(log.timestamp).toLocaleString();
  const action = ACTION_LABELS[log.action] || log.action;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
      >
        <span className="text-xs text-slate-400 font-mono flex-shrink-0 w-32">{ts.split(',')[1]?.trim()}</span>
        <span className="flex-1 text-xs text-slate-700 dark:text-slate-300">{action}</span>
        {log.stateBefore && log.stateAfter && log.stateBefore !== log.stateAfter && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <StatePill state={log.stateBefore} />
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <StatePill state={log.stateAfter} />
          </span>
        )}
        {log.error && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
        <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1.5 font-mono">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {log.angleKey   && <Row label="Angle"      val={`[${log.angleIndex}] ${log.angleKey}`} />}
            {log.escalationLevel && <Row label="Escalation" val={`Level ${log.escalationLevel}`} />}
            {log.nextActionAtAfter && <Row label="Next at"   val={new Date(log.nextActionAtAfter).toLocaleString()} />}
            {log.failureCount != null && <Row label="Failures"  val={log.failureCount} />}
            {log.replyIntent && <Row label="Intent"    val={log.replyIntent} />}
            {log.replyObjectionType && <Row label="Objection" val={log.replyObjectionType} />}
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

function Row({ label, val }) {
  return (
    <>
      <span className="text-slate-400">{label}:</span>
      <span className="text-slate-700 dark:text-slate-300">{String(val)}</span>
    </>
  );
}

export default function V2LeadDebugView({ campaignId, leadId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/v2-debug?leadId=${leadId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load debug data');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [leadId]);

  if (loading) return (
    <div className="space-y-3 p-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  );

  if (error) return (
    <div className="p-4 text-center text-red-500 text-sm">{error}</div>
  );

  const { lead, logs, messages } = data;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            {lead.prospect?.name || lead.prospect?.email || 'Lead Debug View'}
          </h3>
          <p className="text-xs text-slate-500">{lead.prospect?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 gap-1.5 text-xs">
            <RefreshCcw className="h-3 w-3" /> Refresh
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">Close</Button>
          )}
        </div>
      </div>

      {/* State Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StateCard label="v2 State" value={<StatePill state={lead.v2State || 'new'} />} />
        <StateCard label="Attempt" value={`#${lead.attemptCount ?? 0}`} />
        <StateCard label="Failures" value={lead.failureCount ?? 0}
          warn={lead.failureCount > 2} />
        <StateCard label="Stop Flag" value={lead.stopFlag ? '🛑 Yes' : '✓ No'}
          warn={lead.stopFlag} />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <TimingRow label="Next action at" ts={lead.nextActionAt} />
        <TimingRow label="Last opened at" ts={lead.lastOpenedAt} />
        <TimingRow label="Replied at"     ts={lead.repliedAt} />
      </div>

      {/* AI Memory */}
      {lead.aiMemory && (
        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-500" />
              <CardTitle className="text-xs font-semibold">AI Memory</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Row label="Last angle" val={lead.aiMemory.lastAngleIndex != null ? `#${lead.aiMemory.lastAngleIndex}` : 'none'} />
            <Row label="Angle history" val={lead.aiMemory.angleHistory?.join(' → ') || '—'} />
            <Row label="Sentiment" val={lead.aiMemory.sentiment || '—'} />
            <Row label="Objection" val={lead.aiMemory.objectionType || '—'} />
            {lead.aiMemory.replySummary && (
              <div className="col-span-2 mt-1 p-2 bg-slate-50 dark:bg-slate-800/40 rounded text-slate-600 dark:text-slate-400 italic">
                "{lead.aiMemory.replySummary}"
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {messages?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recent Messages</span>
          </div>
          <div className="space-y-1.5">
            {messages.slice(0, 5).map((msg, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.status === 'sent' ? 'bg-emerald-400' : msg.status === 'failed' ? 'bg-red-400' : 'bg-slate-300'}`} />
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-300 truncate">{msg.subject}</span>
                <span className="text-slate-400 flex-shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</span>
                <Badge variant="outline" className="text-xs h-5">{msg.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engine Logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Engine Log</span>
          </div>
          <span className="text-xs text-slate-400">{logs?.length ?? 0} entries</span>
        </div>
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30 overflow-hidden">
          {logs?.length > 0 ? (
            logs.map((log, i) => <LogRow key={i} log={log} />)
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No engine logs yet. The cron will create entries when processing begins.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StateCard({ label, value, warn }) {
  return (
    <div className={`p-3 rounded-xl border text-xs ${warn ? 'border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20' : 'border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30'}`}>
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function TimingRow({ label, ts }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
      <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" />
      <div>
        <p className="text-slate-400 text-[10px]">{label}</p>
        <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
          {ts ? new Date(ts).toLocaleString() : '—'}
        </p>
      </div>
    </div>
  );
}
