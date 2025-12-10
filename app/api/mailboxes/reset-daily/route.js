import dbConnect from '../../../../lib/mongodb.js';
import Mailbox from '../../../../models/MailboxFixed.js';

export async function POST() {
  try {
    await dbConnect();
    
    await Mailbox.updateMany({}, { $set: { dailySent: 0 } });
    
    return Response.json({
      success: true,
      message: 'Daily counts reset'
    });

  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to reset' },
      { status: 500 }
    );
  }
}
