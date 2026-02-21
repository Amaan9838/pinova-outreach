'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Flow Builder page — DEPRECATED
 * The Visual Flow Builder was removed during Outreach Engine v2 migration.
 * Redirects users to the v2-engine tab on the campaign page.
 */
export default function FlowBuilderPage({ params }) {
  const router = useRouter();

  // Auto-redirect after 3 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      router.push(`/campaigns/${params.id}?tab=v2-engine`);
    }, 3000);
    return () => clearTimeout(t);
  }, [params.id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5">
        
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mx-auto">
          <Zap className="h-7 w-7 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            Visual Flow Builder Removed
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The drag-and-drop flow builder was replaced by{' '}
            <strong className="text-purple-600 dark:text-purple-400">Outreach Engine v2</strong>
            , which uses a deterministic state machine with angle rotation — no drag-and-drop needed.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/40 text-sm text-purple-700 dark:text-purple-400">
          Redirecting you to the <strong>v2 Engine tab</strong> in 3 seconds…
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href={`/campaigns/${params.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaign
          </Link>
          <Link
            href={`/campaigns/${params.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-colors shadow-md shadow-purple-500/20"
          >
            <Zap className="h-4 w-4" />
            Open v2 Engine Tab
          </Link>
        </div>
      </div>
    </div>
  );
}
