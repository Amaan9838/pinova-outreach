import dbConnect from '@/lib/mongodb';
import LinkedInLead from '@/models/LinkedInLead';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const skip = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const owner = searchParams.get('owner') || '';
    const followUpDue = searchParams.get('followUpDue') === 'true';

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (owner) filter.owner = owner;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }
    if (followUpDue) {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      filter.nextFollowUp = { $lte: endOfToday, $ne: null };
    }

    const [leads, total, statusCounts, followUpsDueCount] = await Promise.all([
        LinkedInLead.aggregate([
          { $match: filter },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              messages_sent: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$conversations', []] },
                    as: 'c',
                    cond: { $eq: ['$$c.direction', 'outbound'] },
                  },
                },
              },
              replies: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$conversations', []] },
                    as: 'c',
                    cond: { $eq: ['$$c.direction', 'inbound'] },
                  },
                },
              },
            },
          },
          { $project: { conversations: 0 } }
        ]),
      LinkedInLead.countDocuments(filter),
      LinkedInLead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      LinkedInLead.countDocuments({
        nextFollowUp: { $lte: new Date(new Date().setHours(23, 59, 59, 999)), $ne: null },
      }),
    ]);

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    return Response.json({
      success: true,
      leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: await LinkedInLead.countDocuments(),
        statusCounts: statusMap,
        followUpsDue: followUpsDueCount,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('LinkedIn leads GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    // Bulk import: array of leads
    if (Array.isArray(body.leads)) {
      const docs = body.leads.map(l => ({
        firstName: l.firstName || '',
        lastName: l.lastName || '',
        city: l.city || '',
        linkedInUrl: l.linkedInUrl || '',
        status: 'new',
        owner: l.owner || user,
        createdBy: user,
      }));
      const result = await LinkedInLead.insertMany(docs);

      // Log activity for bulk upload
      await CrmActivity.create({
        user,
        action: `uploaded ${result.length} LinkedIn leads`,
        target: '',
        type: 'l',
      });

      return Response.json({ success: true, count: result.length });
    }

    // Single lead
    const lead = await LinkedInLead.create({
      firstName: body.firstName,
      lastName: body.lastName || '',
      city: body.city || '',
      linkedInUrl: body.linkedInUrl || '',
      status: body.status || 'new',
      owner: body.owner || user,
      nextFollowUp: body.nextFollowUp || null,
      createdBy: user,
    });

    // Log activity for single lead
    await CrmActivity.create({
      user,
      action: 'added LinkedIn lead',
      target: `${body.firstName || ''} ${body.lastName || ''}`.trim(),
      type: 'l',
    });

    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('LinkedIn leads POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
