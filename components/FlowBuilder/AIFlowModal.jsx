'use client';

import { useState } from 'react';

const EXAMPLE_PROMPTS = [
  "Send an intro email. Wait 2 days. If they opened it, send a follow-up. If not, send a different email with a new angle. Wait 3 more days then stop.",
  "Send email. Wait 24 hours. Check if replied — if yes, categorize their reply as interested, objection, or not_now and send the appropriate response. If no reply, wait 2 days and send a breakup email.",
  "3-step cold outreach: initial email, wait 3 days, follow-up if not replied, wait 3 more days, final breakup email."
];

export default function AIFlowModal({ onClose, onApplyFlow }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { nodes, edges }

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please describe your campaign flow in more detail.');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch('/api/ai/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setPreview({ nodes: data.nodes, edges: data.edges });
    } catch (e) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApplyFlow(preview.nodes, preview.edges);
      onClose();
    }
  };

  const handleExampleClick = (example) => {
    setPrompt(example);
    setError(null);
    setPreview(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #15102a 50%, #0f1a2a 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 25px 80px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(255,255,255,0.05)',
          maxHeight: '90vh',
        }}
      >
        {/* Glow accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8), rgba(59,130,246,0.8), transparent)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 4px 15px rgba(124,58,237,0.4)' }}
            >
              ✨
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">AI Flow Builder</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Describe your flow, AI builds it instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Describe your campaign flow
            </label>
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(null); }}
              placeholder="e.g. Send an intro email, wait 2 days, if they opened it send a follow-up, if not send a different email..."
              rows={5}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}`,
                color: 'rgba(255,255,255,0.9)',
                caretColor: '#7c3aed',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(139,92,246,0.7)'}
              onBlur={(e) => e.target.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}>
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Try an example:</p>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex)}
                  disabled={loading}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                >
                  💡 {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Preview result summary */}
          {preview && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: '#4ade80' }}>✓</span>
                <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>Flow generated successfully!</span>
              </div>
              <div className="flex gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span>📦 {preview.nodes.length} nodes</span>
                <span>🔗 {preview.edges.length} connections</span>
                <span>
                  🏷 Types: {[...new Set(preview.nodes.map(n => n.type))].join(', ')}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Click "Apply to Canvas" to load this flow. You can edit any node after applying.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {preview ? (
              <>
                <button
                  onClick={() => { setPreview(null); }}
                  className="px-4 py-2 rounded-lg text-sm transition-all"
                  style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Regenerate
                </button>
                <button
                  onClick={handleApply}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 4px 15px rgba(124,58,237,0.35)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.35)'}
                >
                  Apply to Canvas ✦
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2"
                style={{
                  background: loading || !prompt.trim()
                    ? 'rgba(124,58,237,0.3)'
                    : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                  boxShadow: loading || !prompt.trim() ? 'none' : '0 4px 15px rgba(124,58,237,0.35)',
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      style={{ display: 'inline-block' }}
                    />
                    Generating...
                  </>
                ) : (
                  <>✨ Generate Flow</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
