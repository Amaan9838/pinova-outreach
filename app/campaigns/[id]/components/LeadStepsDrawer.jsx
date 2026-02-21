'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Plus, Trash2, Save, Loader2, Edit2, X, CheckCircle2 } from 'lucide-react';

const MAX_STEPS = 7;

function emptyStep(step) {
  return { step, subject: '', body: '' };
}

/**
 * LeadStepsDrawer
 * Opens when user clicks the email-steps badge on a lead row.
 * Shows all per-lead email steps and allows inline editing + save.
 *
 * Props:
 *   open          — boolean
 *   onOpenChange  — fn(bool)
 *   campaignId    — string
 *   prospectId    — string  (the Prospect._id)
 *   leadName      — string  (display name)
 */
export default function LeadStepsDrawer({ open, onOpenChange, campaignId, prospectId, leadName }) {
  const [steps, setSteps]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  // Fetch on open
  useEffect(() => {
    if (!open || !campaignId || !prospectId) return;
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/prospects/${prospectId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const fetched = (data.lead?.emailSteps || []).sort((a, b) => a.step - b.step);
          setSteps(fetched);
        } else {
          toast.error('Could not load email steps');
        }
      })
      .catch(() => toast.error('Network error loading steps'))
      .finally(() => setLoading(false));
  }, [open, campaignId, prospectId]);

  const handleClose = (v) => {
    if (!v && dirty) {
      // Warn on close if unsaved
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setDirty(false);
    onOpenChange(v);
  };

  // ── Step mutations ────────────────────────────────────────────────────────
  const updateStep = (index, field, value) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setDirty(true);
  };

  const addStep = () => {
    const usedNums = new Set(steps.map(s => s.step));
    let next = 1;
    while (usedNums.has(next) && next <= MAX_STEPS) next++;
    if (next > MAX_STEPS) { toast.error(`Maximum ${MAX_STEPS} steps allowed`); return; }
    setSteps(prev => [...prev, emptyStep(next)].sort((a, b) => a.step - b.step));
    setDirty(true);
  };

  const removeStep = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate: all steps must have both subject and body
    const incomplete = steps.filter(s => (!s.subject.trim() && s.body.trim()) || (s.subject.trim() && !s.body.trim()));
    if (incomplete.length > 0) {
      toast.error(`Step ${incomplete[0].step}: both subject and body are required (or leave both empty)`);
      return;
    }

    const validSteps = steps.filter(s => s.subject.trim() || s.body.trim());

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSteps: validSteps })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Email steps saved');
        setSteps(data.emailSteps || validSteps);
        setDirty(false);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error saving steps');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Mail className="h-4 w-4 text-blue-600" />
            Email Steps
            <span className="text-gray-400 font-normal text-sm ml-1">— {leadName}</span>
            {dirty && <Badge variant="outline" className="ml-auto text-xs text-amber-600 border-amber-300 bg-amber-50">Unsaved changes</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading steps…
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-3">
              <Mail className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">No custom email steps yet.</p>
              <p className="text-xs text-gray-300">Add steps below, or leave empty to use the campaign's AI angles / sequence templates.</p>
            </div>
          ) : (
            steps.map((step, idx) => (
              <div key={step.step} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <Badge variant="secondary" className="text-xs shrink-0">Step {step.step}</Badge>
                  <button
                    className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
                    onClick={() => removeStep(idx)}
                    title="Remove step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                    <Input
                      value={step.subject}
                      onChange={e => updateStep(idx, 'subject', e.target.value)}
                      placeholder="Email subject for this step…"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                    <Textarea
                      value={step.body}
                      onChange={e => updateStep(idx, 'body', e.target.value)}
                      placeholder="Email body for this step…"
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {!loading && steps.length < MAX_STEPS && (
            <button
              onClick={addStep}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Step {steps.length + 1}
              <span className="text-xs opacity-60">({MAX_STEPS - steps.length} remaining)</span>
            </button>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 pt-3 gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><Save className="h-4 w-4" /> Save Steps</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
