// DO NOT implement scheduling logic in frontend.
// All execution logic is server-controlled. — PRD §10.14

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Zap, Globe, Clock, Shield, Plus, Trash2, GripVertical, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle2, Info, Layers, BookOpen
} from 'lucide-react';

// ── Global Timezone List (PRD §3.1 — Worldwide support) ──────────────────────
const GLOBAL_TIMEZONES = [
  // US Timezones
  { value: 'America/New_York',    label: 'Eastern (ET)' },
  { value: 'America/Chicago',     label: 'Central (CT)' },
  { value: 'America/Denver',      label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix',     label: 'Arizona (no DST)' },
  { value: 'America/Anchorage',   label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (HST)' },
  // International
  { value: 'UTC',                 label: 'UTC' },
  { value: 'Europe/London',       label: 'London (GMT)' },
  { value: 'Europe/Paris',        label: 'Paris (CET)' },
  { value: 'Asia/Kolkata',        label: 'India (IST)' },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST)' },
];

// ── Preset angles to help users get started ──────────────────────────────────
const ANGLE_PRESETS = [
  { key: 'pain',        description: 'Focus on the lead\'s specific pain points and how the product eliminates them. Empathetic, not salesy.' },
  { key: 'roi',         description: 'Lead with measurable return on investment, cost savings, or revenue impact. Be specific and concise.' },
  { key: 'social',      description: 'Reference relevant customer stories or similar companies who have seen results. Build trust.' },
  { key: 'curiosity',   description: 'Open a curiosity loop without revealing everything. Make them want to learn more.' },
  { key: 'direct',      description: 'Be direct and professional. State clearly what the product does and why it\'s relevant to them now.' },
];

function AngleCard({ angle, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, isMinimum }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group relative flex gap-3 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-800/40 hover:border-purple-300/60 dark:hover:border-purple-700/60 transition-all duration-200">
      {/* Drag handle area (visual only) */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 mt-1" />
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 rounded text-slate-300 hover:text-purple-500 disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 rounded text-slate-300 hover:text-purple-500 disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <Input
            id={`angle-key-${index}`}
            value={angle.key}
            onChange={e => onChange(index, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            placeholder="angle-key (e.g. pain)"
            className="h-8 text-sm font-mono bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 rounded-none px-0 focus-visible:ring-0 focus-visible:border-purple-400"
          />
          <button
            onClick={() => setExpanded(e => !e)}
            className="ml-auto text-xs text-slate-400 hover:text-purple-500 transition-colors flex-shrink-0"
          >
            {expanded ? 'Collapse' : 'Edit'}
          </button>
          {!isMinimum && (
            <button
              onClick={() => onDelete(index)}
              className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {expanded ? (
          <Textarea
            id={`angle-desc-${index}`}
            value={angle.description}
            onChange={e => onChange(index, 'description', e.target.value)}
            placeholder="Describe the tone and framing for this angle. This is passed directly to the AI as an instruction."
            rows={3}
            className="text-sm bg-white/50 dark:bg-slate-900/30 resize-none"
          />
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {angle.description || <span className="italic text-slate-300">No description yet. Click Edit.</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export default function V2EngineTab({ campaign, campaignId, onCampaignUpdate }) {
  const [saving, setSaving] = useState(false);

  // ── v2 settings local state ────────────────────────────────────────────────
  const [useV2Engine, setUseV2Engine] = useState(campaign?.useV2Engine ?? false);
  const [timezone, setTimezone] = useState(campaign?.v2Timezone ?? 'America/New_York');
  const [businessHours, setBusinessHours] = useState({
    startHour: campaign?.v2BusinessHours?.startHour ?? 9,
    endHour:   campaign?.v2BusinessHours?.endHour   ?? 17,
  });
  const [limits, setLimits] = useState({
    dailySendLimit:  campaign?.v2Limits?.dailySendLimit  ?? 100,
    hourlySendLimit: campaign?.v2Limits?.hourlySendLimit ?? 50,
    minGapMinutes:   campaign?.v2Limits?.minGapMinutes   ?? 3,
  });
  const [delays, setDelays] = useState({
    baseDelayHours:       campaign?.v2Delays?.baseDelayHours       ?? 24,
    escalationMultiplier: campaign?.v2Delays?.escalationMultiplier ?? 1.5,
    coolingPeriodDays:    campaign?.v2Delays?.coolingPeriodDays    ?? 30,
    maxAttemptsPerCycle:  campaign?.v2Delays?.maxAttemptsPerCycle  ?? 6,
  });
  const [angles, setAngles] = useState(
    campaign?.v2Angles?.length ? campaign.v2Angles : []
  );
  const [knowledgeBase, setKnowledgeBase] = useState(campaign?.knowledgeBase ?? '');

  // ── Real-time timing calculator ─────────────────────────────────────────────
  // Shows user what times emails will be sent in their timezone
  const timingSequence = useMemo(() => {
    try {
      const now = new Date();
      const sequence = [];
      
      // Helper: Check if time is within business hours in given timezone
      const isBusinessHour = (date, tz, startHour, endHour) => {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(date);
        const hour = parseInt(parts.find(p => p.type === 'hour').value);
        return hour >= startHour && hour < endHour;
      };

      // Helper: Get next business day start in timezone
      const getNextBusinessDayStart = (date, tz, startHour) => {
        const options = { timeZone: tz, weekday: 'short' };
        const dayFormatter = new Intl.DateTimeFormat('en-US', options);
        const day = dayFormatter.format(date);
        const isWeekend = day === 'Sat' || day === 'Sun';
        
        const next = new Date(date);
        if (isWeekend) {
          const daysToAdd = day === 'Sat' ? 2 : 1;
          next.setDate(next.getDate() + daysToAdd);
        }
        
        // Set to start hour in timezone
        const offset = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(next);
        
        return next;
      };

      // Email 1: Initial (now or next business hour)
      let nextTime = new Date(now);
      if (!isBusinessHour(nextTime, timezone, businessHours.startHour, businessHours.endHour)) {
        nextTime = getNextBusinessDayStart(nextTime, timezone, businessHours.startHour);
      }
      sequence.push({
        email: 1,
        delay: 'Immediate',
        time: nextTime,
        timeStr: nextTime.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }),
      });

      // Email 2-6: Follow-ups with exponential delays
      for (let i = 1; i < 6; i++) {
        const delayHours = delays.baseDelayHours * Math.pow(delays.escalationMultiplier, i - 1);
        const candidate = new Date(sequence[i - 1].time.getTime() + delayHours * 60 * 60 * 1000);
        
        // Enforce business hours
        if (!isBusinessHour(candidate, timezone, businessHours.startHour, businessHours.endHour)) {
          candidate.setUTCHours(businessHours.startHour, 0, 0, 0);
        }
        
        sequence.push({
          email: i + 1,
          delay: `+${Math.round(delayHours)}h`,
          time: candidate,
          timeStr: candidate.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }),
        });
      }

      return sequence;
    } catch (err) {
      console.error('Timing calculator error:', err);
      return [];
    }
  }, [timezone, businessHours.startHour, businessHours.endHour, delays.baseDelayHours, delays.escalationMultiplier]);

  // ── Angle management ───────────────────────────────────────────────────────
  const addAngle = () => {
    setAngles(prev => [...prev, { key: `angle_${prev.length + 1}`, description: '' }]);
  };

  const addPreset = (preset) => {
    if (angles.find(a => a.key === preset.key)) {
      toast.error(`Angle "${preset.key}" already exists`);
      return;
    }
    setAngles(prev => [...prev, { ...preset }]);
  };

  const updateAngle = useCallback((idx, field, value) => {
    setAngles(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }, []);

  const deleteAngle = useCallback((idx) => {
    setAngles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const moveAngle = useCallback((idx, dir) => {
    setAngles(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validAngles = angles.filter(a => a.key && a.description);
  const anglesReady = validAngles.length >= 3;
  const delayValid = delays.baseDelayHours >= 24;
  const limitWarning = limits.dailySendLimit > 150;
  const canSave = delayValid;

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) {
      toast.error('Base delay must be at least 24h (PRD §3.5)');
      return;
    }
    if (angles.some(a => !a.key || !a.description)) {
      toast.error('All angles must have both a key and description');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/v2-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useV2Engine,
          v2Timezone: timezone,
          v2BusinessHours: businessHours,
          v2Limits: limits,
          v2Delays: delays,
          v2Angles: angles,
          knowledgeBase: knowledgeBase.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      toast.success('v2 Engine settings saved');
      if (onCampaignUpdate) onCampaignUpdate(data.campaign);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header + Toggle */}
      <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20 border border-purple-200/60 dark:border-purple-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Outreach Engine v2</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic state machine · Business hours · Auto-classification
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor="v2-toggle" className="text-xs text-slate-500">
            {useV2Engine ? 'Enabled' : 'Disabled'}
          </Label>
          <Switch
            id="v2-toggle"
            checked={useV2Engine}
            onCheckedChange={setUseV2Engine}
            disabled={campaign?.status === 'active'}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
      </div>

      {campaign?.status === 'active' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-sm">
          <Info className="h-4 w-4 flex-shrink-0" />
          Cannot toggle v2 engine while campaign is active. Pause first.
        </div>
      )}

      {/* Section A: Timezone & Business Hours */}
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold">Timezone & Business Hours</CardTitle>
          </div>
          <CardDescription className="text-xs">Emails will only send within these hours in the chosen timezone (PRD §3.3)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-9 bg-white/70 dark:bg-slate-900/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GLOBAL_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Hour (24h)</Label>
                <Input
                  type="number" min={6} max={12}
                  value={businessHours.startHour}
                  onChange={e => setBusinessHours(p => ({ ...p, startHour: +e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Hour (24h)</Label>
                <Input
                  type="number" min={14} max={20}
                  value={businessHours.endHour}
                  onChange={e => setBusinessHours(p => ({ ...p, endHour: +e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Sending window: {businessHours.startHour}:00 – {businessHours.endHour}:00 {GLOBAL_TIMEZONES.find(t => t.value === timezone)?.label}. Weekends are always skipped.
          </p>
          
          {/* Real-time Timing Preview */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Email Send Times in {GLOBAL_TIMEZONES.find(t => t.value === timezone)?.label}:</p>
            <div className="space-y-1">
              {timingSequence.map(item => (
                <div key={item.email} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs">
                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">Email {item.email}:</span>
                  <span className="text-slate-600 dark:text-slate-300">{item.timeStr} <span className="text-slate-400">({item.delay})</span></span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">After 6 attempts: 30-day cooling period</p>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Rate Limits */}
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-sm font-semibold">Deliverability Limits</CardTitle>
          </div>
          <CardDescription className="text-xs">Per-mailbox rate limits to protect domain reputation (PRD §3.4)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {limitWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              Daily limit above 150 may impact deliverability for new domains.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Daily Send Limit</Label>
              <Input
                type="number" min={5} max={200}
                value={limits.dailySendLimit}
                onChange={e => setLimits(p => ({ ...p, dailySendLimit: +e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-xs text-slate-400">Max 200</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hourly Send Limit</Label>
              <Input
                type="number" min={1} max={100}
                value={limits.hourlySendLimit}
                onChange={e => setLimits(p => ({ ...p, hourlySendLimit: +e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-xs text-slate-400">Max 100</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min Gap (minutes)</Label>
              <Input
                type="number" min={2} max={60}
                value={limits.minGapMinutes}
                onChange={e => setLimits(p => ({ ...p, minGapMinutes: +e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-xs text-slate-400">Anti-burst (PRD §3.10)</p>
            </div>
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base Delay (hours)</Label>
              <Input
                type="number" min={24} max={168}
                value={delays.baseDelayHours}
                onChange={e => setDelays(p => ({ ...p, baseDelayHours: +e.target.value }))}
                className={`h-9 text-sm ${!delayValid ? 'border-red-400' : ''}`}
              />
              {!delayValid && <p className="text-xs text-red-500">Must be ≥ 24h</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Escalation ×</Label>
              <Input
                type="number" min={1} max={3} step={0.1}
                value={delays.escalationMultiplier}
                onChange={e => setDelays(p => ({ ...p, escalationMultiplier: +e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-xs text-slate-400">Delay multiplier</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max Attempts</Label>
              <Input
                type="number" min={3} max={12}
                value={delays.maxAttemptsPerCycle}
                onChange={e => setDelays(p => ({ ...p, maxAttemptsPerCycle: +e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cooling (days)</Label>
              <Input
                type="number" min={7} max={90}
                value={delays.coolingPeriodDays}
                onChange={e => setDelays(p => ({ ...p, coolingPeriodDays: +e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section C: Angle Configuration */}
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-semibold">Angle Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {anglesReady
                ? <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> {validAngles.length} ready
                  </Badge>
                : <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> {validAngles.length}/3 minimum
                  </Badge>
              }
            </div>
          </div>
          <CardDescription className="text-xs">
            Each angle rotates deterministically per attempt. The AI uses the angle description as a tone/framing instruction. Min 3 to activate (PRD §5.1).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset quick-add */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick add preset:</p>
            <div className="flex flex-wrap gap-1.5">
              {ANGLE_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => addPreset(p)}
                  disabled={!!angles.find(a => a.key === p.key)}
                  className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  + {p.key}
                </button>
              ))}
            </div>
          </div>

          {/* Angle list */}
          <div className="space-y-2">
            {angles.map((angle, idx) => (
              <AngleCard
                key={idx}
                angle={angle}
                index={idx}
                onChange={updateAngle}
                onDelete={deleteAngle}
                onMoveUp={() => moveAngle(idx, -1)}
                onMoveDown={() => moveAngle(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === angles.length - 1}
                isMinimum={angles.length <= 3}
              />
            ))}
            {angles.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No angles configured. Add 3+ angles to enable activation.
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addAngle}
            className="w-full border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 gap-2 text-slate-500"
          >
            <Plus className="h-3.5 w-3.5" /> Add Custom Angle
          </Button>
        </CardContent>
      </Card>

      {/* Section D: AI Knowledge Base */}
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-500" />
            <CardTitle className="text-sm font-semibold">AI Knowledge Base</CardTitle>
          </div>
          <CardDescription className="text-xs">
            This context is injected into every AI-generated email and reply. Include your product description, value props, and key differentiators. The more specific, the better.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="knowledgeBase"
            value={knowledgeBase}
            onChange={e => setKnowledgeBase(e.target.value)}
            placeholder={`Example:\n"We help real estate teams respond to new leads within 60 seconds using AI. Our clients see 3x more booked appointments without hiring extra staff. Key differentiator: we plug into their existing CRM and don't require any workflow changes."`}
            rows={7}
            className="text-sm resize-none bg-white/70 dark:bg-slate-900/50 font-mono"
          />
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sky-400" />
            <span>Used by the AI when generating outreach emails and when auto-replying to positive/objection responses. Plain text only. 100–500 words is ideal.</span>
          </div>
          {knowledgeBase.trim().length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-slate-500">{knowledgeBase.trim().split(/\s+/).length} words</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          <Clock className="h-3 w-3 inline mr-1" />
          Settings apply to the next cron tick (every 5 min). No leads are processed immediately.
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md shadow-purple-500/20 gap-2"
        >
          {saving ? (
            <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Saving…</span>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Save v2 Settings</>
          )}
        </Button>
      </div>
    </div>
  );
}
