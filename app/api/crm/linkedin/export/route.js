import dbConnect from '@/lib/mongodb';
import LinkedInLead from '@/models/LinkedInLead';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    // Customizable filters — same as the list view
    const status = searchParams.get('status') || '';
    const owner = searchParams.get('owner') || '';
    const search = searchParams.get('search') || '';

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

    const leads = await LinkedInLead.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Find max conversations to build dynamic headers
    let maxConvos = 0;
    for (const lead of leads) {
      const count = Array.isArray(lead.conversations) ? lead.conversations.length : 0;
      if (count > maxConvos) maxConvos = count;
    }

    // Build CSV header
    const baseHeaders = [
      'S.No', 'First Name', 'Last Name', 'City', 'LinkedIn URL',
      'Status', 'Owner', 'Next Follow-Up', 'Created At',
      'Total Messages', 'Outbound Count', 'Inbound Count',
    ];

    const msgHeaders = [];
    for (let i = 1; i <= maxConvos; i++) {
      msgHeaders.push(`Msg ${i} Direction`, `Msg ${i} Date`, `Msg ${i} By`, `Msg ${i} Content`);
    }

    const allHeaders = [...baseHeaders, ...msgHeaders];

    // Build rows
    const rows = leads.map((lead, idx) => {
      const conversations = Array.isArray(lead.conversations) ? lead.conversations : [];
      conversations.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

      const outbound = conversations.filter(c => c.direction === 'outbound').length;
      const inbound = conversations.filter(c => c.direction === 'inbound').length;

      const row = [
        idx + 1,
        lead.firstName || '',
        lead.lastName || '',
        lead.city || '',
        lead.linkedInUrl || '',
        (lead.status || '').toUpperCase(),
        lead.owner || '',
        lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString('en-IN') : '',
        lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '',
        conversations.length,
        outbound,
        inbound,
      ];

      for (const conv of conversations) {
        row.push(
          (conv.direction || '').toUpperCase(),
          conv.timestamp ? new Date(conv.timestamp).toLocaleString('en-IN') : '',
          conv.loggedBy || '',
          conv.message || ''
        );
      }

      return row;
    });

    // Build CSV string
    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      allHeaders.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ];
    const csvContent = csvLines.join('\r\n');

    const filename = `LinkedIn_Outreach_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('LinkedIn export error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
