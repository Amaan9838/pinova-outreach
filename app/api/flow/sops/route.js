import dbConnect from '../../../../lib/mongodb.js';
import GtdMeta from '../../../../models/GtdMeta.js';

export const dynamic = 'force-dynamic';

const DEFAULT_SOPS = [
  {
    id: 'outbound_prospect',
    label: 'Outbound — Prospect to Campaign',
    area: 'outbound',
    icon: '🎯',
    desc: 'Find, qualify leads using Comet & AI Assistant browser, write emails with templates, and schedule a CSV campaign (Mon-Thu).',
    steps: [
      { text: 'Define the lead targeting prompt for Comet browser & AI assistant browser for {name}', energy: 'medium' },
      { text: 'Run Comet browser & AI assistant browser to scrape & extract qualified leads for {name}', energy: 'medium' },
      { text: 'Filter and clean the qualified leads from the browser run into a clean CSV file for {name}', energy: 'low' },
      { text: 'Write personalized cold emails for qualified leads using the cold email templates for {name}', energy: 'high' },
      { text: 'Configure and schedule the campaign in Pinova Outreach to send daily from Monday to Thursday for {name}', energy: 'medium' },
      { text: 'Import the lead CSV file into the newly scheduled campaign and launch for {name}', energy: 'low' }
    ]
  },
  {
    id: 'outbound_close',
    label: 'Close Deal',
    area: 'outbound',
    icon: '🤝',
    desc: 'Convert positive reply into customer.',
    steps: [
      { text: 'Add prospect {name} to the Leads table of the CRM page as a Warm Lead', energy: 'low' },
      { text: 'Research {name}\'s current website thoroughly to identify branding and structure', energy: 'medium' },
      { text: 'Build personalized demo homepage for {name} using the base template', energy: 'high' },
      { text: 'Send personalized demo site link to {name} with a walkthrough', energy: 'medium' },
      { text: 'Create follow-up task in Flow CRM to check if {name} viewed the site', energy: 'low' },
      { text: 'Follow up with {name} after 2 days if no response to the demo site', energy: 'low' },
      { text: 'Schedule feedback call with {name} to discuss the demo website', energy: 'low' },
      { text: 'Address {name}\'s feedback and make revisions to the demo site', energy: 'medium' },
      { text: 'Send final proposal with customized pricing and package details to {name}', energy: 'medium' },
      { text: 'Follow up on proposal within 2 days to close deal or handle objections', energy: 'low' }
    ]
  },
  {
    id: 'inbound_lead',
    label: 'Qualify & Convert',
    area: 'inbound',
    icon: '📩',
    desc: 'Someone showed interest. Qualify and move to close.',
    steps: [
      { text: 'Research {name} — profile, company, how they found us', energy: 'medium' },
      { text: 'Qualify {name} — right fit? Decision maker? Budget?', energy: 'low' },
      { text: 'Reply to {name} with personalized message', energy: 'medium' },
      { text: 'Engage with {name}\'s recent social posts', energy: 'low' },
      { text: 'Share relevant case study with {name}', energy: 'low' },
      { text: 'Propose a quick demo call with {name}', energy: 'low' }
    ]
  },
  {
    id: 'delivery_onboard',
    label: 'Client Onboarding',
    area: 'delivery',
    icon: '🚀',
    desc: 'Build site, set up Pinova, launch.',
    steps: [
      { text: 'Research {name}\'s brand, competitors, and audience', energy: 'high' },
      { text: 'Build client homepage for {name} — customize template', energy: 'high' },
      { text: 'Set up {name}\'s Pinova account — mailboxes, domains, warm-up', energy: 'medium' },
      { text: 'Send site draft to {name} for review', energy: 'low' },
      { text: 'Implement {name}\'s revision requests', energy: 'medium' },
      { text: 'Launch {name}\'s site and confirm everything working', energy: 'low' },
      { text: 'Write onboarding email to {name} with docs', energy: 'medium' }
    ]
  },
  {
    id: 'ops_new_mailbox',
    label: 'New Mailbox Setup',
    area: 'ops',
    icon: '📧',
    desc: 'Set up sending mailbox with proper deliverability.',
    steps: [
      { text: 'Purchase domain for {name} mailbox', energy: 'low' },
      { text: 'Set up DNS records — SPF, DKIM, DMARC for {name}', energy: 'medium' },
      { text: 'Create email account on {name} domain', energy: 'low' },
      { text: 'Add {name} mailbox to Pinova and connect', energy: 'low' },
      { text: 'Start warm-up sequence for {name} (14 days)', energy: 'low' },
      { text: 'Check warm-up after 7 days — inbox rate, spam', energy: 'low' },
      { text: 'Verify deliverability after 14 days — run test sends', energy: 'low' }
    ]
  }
];

export async function GET() {
  try {
    await dbConnect();
    let doc = await GtdMeta.findOne({ key: 'sop_templates' }).lean();
    if (!doc) {
      doc = await GtdMeta.create({ key: 'sop_templates', value: DEFAULT_SOPS });
    }
    return Response.json({ success: true, sops: doc.value });
  } catch (error) {
    console.error('GET /api/flow/sops error:', error);
    return Response.json({ success: false, error: 'Failed to fetch SOP templates' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const { sops } = await request.json();
    if (!Array.isArray(sops)) {
      return Response.json({ success: false, error: 'Invalid SOP templates format' }, { status: 400 });
    }

    const doc = await GtdMeta.findOneAndUpdate(
      { key: 'sop_templates' },
      { value: sops },
      { upsert: true, new: true }
    );

    return Response.json({ success: true, sops: doc.value });
  } catch (error) {
    console.error('PUT /api/flow/sops error:', error);
    return Response.json({ success: false, error: 'Failed to save SOP templates' }, { status: 500 });
  }
}
