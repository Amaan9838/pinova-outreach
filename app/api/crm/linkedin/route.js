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

    const [leads, total, statusCounts, followUpsDueCount, totalMessaged] = await Promise.all([
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
      // Count leads that have at least one outbound conversation
      LinkedInLead.countDocuments({
        'conversations.direction': 'outbound',
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
        totalMessaged,
        followUpsDue: followUpsDueCount,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('LinkedIn leads GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  url = url.trim();
  if (url === '') return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    // Bulk import: array of leads
    if (Array.isArray(body.leads)) {
      // Find existing URLs to skip duplicates
      const sanitizedUrls = body.leads.map(l => sanitizeUrl(l.linkedInUrl)).filter(Boolean);
      const existingLeads = await LinkedInLead.find({ linkedInUrl: { $in: sanitizedUrls } }).select('linkedInUrl');
      const existingUrls = new Set(existingLeads.map(l => l.linkedInUrl));

      const newDocs = body.leads.filter(l => {
        const url = sanitizeUrl(l.linkedInUrl);
        return !url || !existingUrls.has(url);
      }).map(l => ({
        firstName: l.firstName || '',
        lastName: l.lastName || '',
        city: l.city || '',
        linkedInUrl: sanitizeUrl(l.linkedInUrl) || '',
        status: 'new',
        owner: l.owner || user,
        createdBy: user,
      }));

      if (newDocs.length === 0 && body.leads.length > 0) {
        return Response.json({ success: false, error: 'All provided leads are already in the system.' }, { status: 400 });
      }

      if (newDocs.length > 0) {
        const result = await LinkedInLead.insertMany(newDocs);

        // Log activity for bulk upload
        await CrmActivity.create({
          user,
          action: `uploaded ${result.length} LinkedIn leads`,
          target: '',
          type: 'l',
        });

        return Response.json({ success: true, count: result.length, skipped: body.leads.length - result.length });
      } else {
        return Response.json({ success: true, count: 0, skipped: 0 });
      }
    }

    // Single lead
    const linkedInUrl = sanitizeUrl(body.linkedInUrl) || '';
    
    if (linkedInUrl) {
      const existing = await LinkedInLead.findOne({ linkedInUrl });
      if (existing) {
        return Response.json({ 
          success: false, 
          error: `This lead is already present in the system, owned by ${existing.owner || 'Unknown'}.` 
        }, { status: 400 });
      }
    }

    const lead = await LinkedInLead.create({
      firstName: body.firstName,
      lastName: body.lastName || '',
      city: body.city || '',
      linkedInUrl: linkedInUrl,
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
