// ─────────────────────────────────────────────────────────────────────────────
// app/api/campaigns/[id]/flow/route.js
//
// DEPRECATED — Visual Flow system was removed during Outreach Engine v2 cleanup.
// The EmailFlow model no longer exists.
//
// This stub returns 410 Gone for all methods so the app compiles cleanly.
// The flow-builder page shows users a redirect notice.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const GONE = () =>
  NextResponse.json(
    {
      success: false,
      error: 'Visual Flow Builder was removed. Use Outreach Engine v2 (Angles system) instead.',
      deprecated: true,
    },
    { status: 410 }
  );

export const GET    = GONE;
export const POST   = GONE;
export const PUT    = GONE;
export const DELETE = GONE;
