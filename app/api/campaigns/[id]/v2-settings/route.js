// ─────────────────────────────────────────────────────────────────────────────
// app/api/campaigns/[id]/v2-settings/route.js
//
// v2 Engine settings update endpoint.
// Only allowed mutations per PRD §9.3:
//   - v2Angles
//   - v2Timezone
//   - v2BusinessHours
//   - v2Limits
//   - v2Delays
//   - useV2Engine toggle (pre-activation only)
//
// FORBIDDEN by this endpoint:
//   - Changing nextActionAt directly
//   - Changing v2State directly
//   - Any scheduling field that processLead() owns
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';

// Allowed field keys — whitelist approach (PRD §9.3)
const ALLOWED_KEYS = new Set([
  'useV2Engine',
  'v2Timezone',
  'v2BusinessHours',
  'v2Limits',
  'v2Delays',
  'v2Angles',
  'goal',
  'knowledgeBase'
]);

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await req.json();

    // Strip any forbidden keys
    const updatePayload = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key)) {
        updatePayload[key] = value;
      } else {
        console.warn(`[v2-settings] Ignored forbidden field: ${key}`);
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid changeable fields provided' }, { status: 400 });
    }

    // Keep legacy scheduling fields in sync so all tabs show the same timezone/hours.
    if (updatePayload.v2Timezone) {
      updatePayload['scheduling.timezone'] = updatePayload.v2Timezone;
    }
    if (updatePayload.v2BusinessHours) {
      const startHour = Number.parseInt(updatePayload.v2BusinessHours.startHour, 10);
      const endHour = Number.parseInt(updatePayload.v2BusinessHours.endHour, 10);
      if (Number.isInteger(startHour)) {
        updatePayload['scheduling.businessHours.startTime'] = `${String(startHour).padStart(2, '0')}:00`;
      }
      if (Number.isInteger(endHour)) {
        updatePayload['scheduling.businessHours.endTime'] = `${String(endHour).padStart(2, '0')}:00`;
      }
    }

    // Validation: If enabling v2, must have angles
    if (updatePayload.v2Angles && updatePayload.v2Angles.length > 0) {
      const invalidAngles = updatePayload.v2Angles.filter(a => !a.key || !a.description);
      if (invalidAngles.length > 0) {
        return NextResponse.json({ error: 'Each angle must have both `key` and `description`' }, { status: 400 });
      }
    }

    // Validation: Cannot enable v2 on active campaign (PRD §9.3)
    if (updatePayload.useV2Engine !== undefined) {
      const campaign = await Campaign.findById(id).select('status useV2Engine');
      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      if (campaign.status === 'active') {
        return NextResponse.json(
          { error: 'Cannot toggle useV2Engine on an active campaign. Pause first.' },
          { status: 400 }
        );
      }
    }

    const updated = await Campaign.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, select: 'useV2Engine v2Timezone v2BusinessHours v2Limits v2Delays v2Angles status name goal knowledgeBase' }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign: updated });

  } catch (err) {
    console.error('[v2-settings] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const campaign = await Campaign.findById(params.id)
      .select('name status useV2Engine v2Timezone v2BusinessHours v2Limits v2Delays v2Angles goal knowledgeBase');
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
