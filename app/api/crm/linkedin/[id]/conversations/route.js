import dbConnect from '@/lib/mongodb';
import LinkedInLead from '@/models/LinkedInLead';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const lead = await LinkedInLead.findById(id).select('conversations').lean();
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
    return Response.json({ success: true, conversations: lead.conversations || [] });
  } catch (error) {
    console.error('Conversations GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    const lead = await LinkedInLead.findByIdAndUpdate(
      id,
      {
        $push: {
          conversations: {
            message: body.message,
            direction: body.direction || 'note',
            loggedBy: user,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
    return Response.json({ success: true, conversations: lead.conversations });
  } catch (error) {
    console.error('Conversations POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
