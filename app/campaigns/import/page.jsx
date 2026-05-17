'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_REPLY_TEMPLATE = [
  '{{firstName}},',
  '',
  'Got your reply, thank you.',
  '',
  'I can send over the redesigned version within the next hour. The idea is simple: keep the brand premium, make the site easy for relocating and out-of-state buyers to access, and remove the friction that is currently blocking people before they even see the listings.',
  '',
  'I will send you the preview link shortly.',
  '',
  '- {{senderName}}'
].join('\n');

const TEMPLATE_VARIABLES = ['{{firstName}}', '{{name}}', '{{company}}', '{{senderName}}', '{{senderEmail}}', '{{replySnippet}}'];

export default function CampaignImportPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [result, setResult] = useState(null);
  const [replyTemplate, setReplyTemplate] = useState({
    enabled: true,
    subject: '',
    body: DEFAULT_REPLY_TEMPLATE
  });

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!campaignName.trim()) {
      setCampaignName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }
    const reader = new FileReader();
    reader.onload = (e) => setCsvData(String(e.target?.result || ''));
    reader.readAsText(file);
  }

  async function createDraftCampaign() {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!csvData.trim()) {
      toast.error('Upload or paste the Claude output CSV');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/campaigns/import-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          csvData,
          replyTemplate
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Campaign creation failed');
      setResult(json);
      toast.success(json.message || 'Draft campaign created');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090c] text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push('/campaigns')}
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" /> Campaigns
            </button>
            <h1 className="text-3xl font-semibold tracking-normal text-white">Import Campaign</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Upload Claude's final CSV. Pinova uses the saved ET (America/New_York) seven-mailbox preset automatically and creates a draft for review.
            </p>
          </div>
          <Button onClick={createDraftCampaign} disabled={loading} className="gap-2 bg-white text-black hover:bg-zinc-200">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Create Draft
          </Button>
        </div>

        <Card className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> Claude CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign name"
              className="border-zinc-800 bg-zinc-900"
            />
            <div className="flex flex-wrap gap-3">
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                <Upload className="h-4 w-4" /> Upload CSV
              </Button>
              {fileName && <span className="self-center text-sm text-zinc-400">{fileName}</span>}
            </div>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste Claude CSV output here"
              className="min-h-[430px] border-zinc-800 bg-zinc-900 font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Reply Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={replyTemplate.enabled}
                onChange={(e) => setReplyTemplate({ ...replyTemplate, enabled: e.target.checked })}
              />
              Send this template automatically when a prospect replies
            </label>
            <Input
              value={replyTemplate.subject}
              onChange={(e) => setReplyTemplate({ ...replyTemplate, subject: e.target.value })}
              placeholder="Leave blank to use the same email thread subject"
              className="border-zinc-800 bg-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              Leave subject blank to reply with the original email thread subject. That is best for Gmail/Outlook threading.
            </p>
            <Textarea
              value={replyTemplate.body}
              onChange={(e) => setReplyTemplate({ ...replyTemplate, body: e.target.value })}
              placeholder="Reply body"
              className="min-h-[220px] border-zinc-800 bg-zinc-900 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => setReplyTemplate({ ...replyTemplate, body: `${replyTemplate.body}${replyTemplate.body.endsWith(' ') || replyTemplate.body.endsWith('\n') ? '' : ' '}${variable}` })}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  {variable}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Variables personalize per reply. `replySnippet` inserts a short piece of what the prospect wrote.
            </p>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-emerald-900 bg-emerald-950/40 text-zinc-100">
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-medium text-emerald-100">Draft campaign ready</p>
                  <p className="text-sm text-emerald-200/80">
                    {result.imported} prospects imported. Review before scheduling or starting.
                    {result.errors ? ` ${result.errors.length} rows need review.` : ''}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => router.push(`/campaigns/${result.campaign.id}`)}
                className="bg-emerald-200 text-emerald-950 hover:bg-emerald-100"
              >
                Review Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
