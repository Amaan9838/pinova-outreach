import dbConnect from '@/lib/mongodb';
import LinkedInLead from '@/models/LinkedInLead';
import CrmActivity from '@/models/CrmActivity';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    const allowed = ['firstName', 'lastName', 'city', 'linkedInUrl', 'status', 'owner', 'nextFollowUp'];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const lead = await LinkedInLead.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    // Log status change activity
    if (update.status) {
      const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
      await CrmActivity.create({
        user,
        action: `changed status to ${update.status}`,
        target: name,
        type: 'l',
      });
    }

    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('LinkedIn lead PATCH error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const lead = await LinkedInLead.findById(id).lean();
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('LinkedIn lead GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const user = request.headers.get('x-crm-user') || 'Unknown';
    const result = await LinkedInLead.findByIdAndDelete(id);
    if (!result) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    // Log delete activity
    const name = `${result.firstName || ''} ${result.lastName || ''}`.trim();
    await CrmActivity.create({
      user,
      action: 'deleted LinkedIn lead',
      target: name,
      type: 'l',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('LinkedIn lead DELETE error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
