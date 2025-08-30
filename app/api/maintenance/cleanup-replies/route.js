import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await dbConnect();

    const messages = await Message.find({ 'events.type': 'replied' });

    let scanned = 0;
    let updated = 0;
    let removedEvents = 0;

    for (const msg of messages) {
      scanned++;
      const newEvents = [];
      const seenReplyIds = new Set();
      let changed = false;

      for (const ev of msg.events || []) {
        if (ev.type !== 'replied') {
          newEvents.push(ev);
          continue;
        }
        const key = (ev.data && ev.data.messageId) ? `mid:${ev.data.messageId}` : `ts:${new Date(ev.timestamp).getTime()}`;
        if (seenReplyIds.has(key)) {
          // duplicate, skip
          removedEvents++;
          changed = true;
          continue;
        }
        seenReplyIds.add(key);
        newEvents.push(ev);
      }

      // Optionally, ensure status reflects presence of reply
      if (newEvents.some(e => e.type === 'replied') && msg.status !== 'replied') {
        msg.status = 'replied';
        changed = true;
      }

      if (changed) {
        msg.events = newEvents;
        await msg.save();
        updated++;
      }
    }

    return Response.json({
      success: true,
      scanned,
      updated,
      removedEvents
    });

  } catch (error) {
    console.error('Cleanup replies error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
