// Test script to fix campaign activation issue
import dbConnect from './lib/mongodb.js';
import Campaign from './models/Campaign.js';
import Mailbox from './models/MailboxFixed.js';

async function fixCampaignActivation() {
  try {
    await dbConnect();
    
    // Get the active campaign
    const campaign = await Campaign.findById('68b91e1684dd4d52c7d737f9')
      .populate('prospects.prospectId');
      
    if (!campaign) {
      console.log('Campaign not found');
      return;
    }
    
    console.log(`Campaign: ${campaign.name}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Prospects: ${campaign.prospects.length}`);
    
    // Get mailbox
    const mailbox = await Mailbox.findById('68a87171d648e0cdd33d3161');
    console.log(`Mailbox: ${mailbox.fromEmail} (${mailbox.status})`);
    
    // Fix prospects - set them to active and give them nextSendAt
    const now = new Date();
    let fixed = 0;
    
    for (const cp of campaign.prospects) {
      console.log(`Prospect ${cp.prospectId?.email}: status=${cp.status}, nextSendAt=${cp.nextSendAt}`);
      
      if (cp.prospectId && cp.prospectId.status === 'active') {
        cp.status = 'active';
        cp.nextSendAt = new Date(now.getTime() + (fixed * 2 * 60 * 1000)); // Stagger by 2 minutes
        console.log(`Fixed prospect ${cp.prospectId.email} - nextSendAt: ${cp.nextSendAt}`);
        fixed++;
      }
    }
    
    // Set mailbox
    if (!campaign.options) campaign.options = {};
    campaign.options.selectedMailbox = mailbox._id;
    
    // Add to mailboxes array for compatibility
    if (!campaign.mailboxes) campaign.mailboxes = [];
    if (!campaign.mailboxes.includes(mailbox._id)) {
      campaign.mailboxes.push(mailbox._id);
    }
    
    await campaign.save();
    console.log(`Fixed ${fixed} prospects and saved campaign`);
    
    // Now test if emails will send
    console.log('\n=== TESTING EMAIL PROCESSING ===');
    
    const response = await fetch('http://localhost:3000/api/cron/process-sequences', {
      method: 'POST'
    });
    
    const result = await response.json();
    console.log('Processing result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCampaignActivation();
