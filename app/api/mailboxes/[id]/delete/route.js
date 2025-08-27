import dbConnect from '../../../../../lib/mongodb.js';
import Mailbox from '../../../../../models/MailboxFixed.js';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const mailbox = await Mailbox.findById(id);
    if (!mailbox) {
      return Response.json(
        { success: false, error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    // Delete the mailbox
    await Mailbox.findByIdAndDelete(id);

    return Response.json({
      success: true,
      message: 'Mailbox deleted successfully'
    });

  } catch (error) {
    console.error('Delete mailbox error:', error);
    return Response.json(
      { success: false, error: 'Failed to delete mailbox: ' + error.message },
      { status: 500 }
    );
  }
}
