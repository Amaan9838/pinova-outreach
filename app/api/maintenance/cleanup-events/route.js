import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await dbConnect();

    // Process messages that have many events first
    const messages = await Message.find({ 'events.10': { $exists: true } });

    let scanned = 0;
    let updated = 0;
    let removed = 0;

    for (const msg of messages) {
      scanned++;
      const seen = {
        sent: false,
        delivered: false,
        opened: false,
      };

      const keep = [];
      const events = msg.events || [];

      // Sort ascending to keep earliest first occurrence
      events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const ev of events) {
        if (ev.type === 'sent') {
          if (!seen.sent) { keep.push(ev); seen.sent = true; } else { removed++; }
          continue;
        }
        if (ev.type === 'delivered') {
          // unique by first occurrence
          if (!seen.delivered) { keep.push(ev); seen.delivered = true; } else { removed++; }
          continue;
        }
        if (ev.type === 'opened') {
          // Keep only first open
          if (!seen.opened) { keep.push(ev); seen.opened = true; } else { removed++; }
          continue;
        }
        if (ev.type === 'replied') {
          // Unique by messageId if present; else by replyHash if available; else first
          const keyMsgId = ev?.data?.messageId || null;
          const keyHash = ev?.data?.replyHash || null;
          const already = keyMsgId
            ? keep.some(e => e.type === 'replied' && e?.data?.messageId === keyMsgId)
            : keyHash
              ? keep.some(e => e.type === 'replied' && e?.data?.replyHash === keyHash)
              : keep.some(e => e.type === 'replied');
          if (!already) { keep.push(ev); } else { removed++; }
          continue;
        }
        // For other types (clicked, bounced, etc.) keep as-is but avoid exact duplicates by timestamp+type
        const dup = keep.some(e => e.type === ev.type && new Date(e.timestamp).getTime() === new Date(ev.timestamp).getTime());
        if (!dup) { keep.push(ev); } else { removed++; }
      }

      let changed = keep.length !== events.length;

      // Recompute status based on most recent kept event
      if (keep.length > 0) {
        const last = keep[keep.length - 1];
        let newStatus = msg.status;
        if (last.type === 'replied') newStatus = 'replied';
        else if (last.type === 'bounced') newStatus = 'bounced';
        else if (last.type === 'delivered') newStatus = 'delivered';
        else if (last.type === 'sent') newStatus = 'sent';
        if (newStatus !== msg.status) { msg.status = newStatus; changed = true; }
      }

      if (changed) {
        // Ensure chronological order is preserved (ascending)
        msg.events = keep;
        await msg.save();
        updated++;
      }
    }

    return Response.json({ success: true, scanned, updated, removed });
  } catch (error) {
    console.error('Cleanup events error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
