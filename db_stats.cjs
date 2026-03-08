const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    const campaignId = new ObjectId('69a80e78f5366ce2334bda1f');
    const email = 'mtwebsite1@gmail.com';

    // 1. Prospect Info
    const baseProspect = await db.collection('prospects').findOne({ email });
    let campaignProspect = null;
    if (baseProspect) {
      campaignProspect = await db.collection('campaignprospects').findOne({
        campaign: campaignId,
        prospect: baseProspect._id
      });
    }

    // 2. Campaign Stats
    const totalLeads = await db.collection('campaignprospects').countDocuments({ campaign: campaignId });
    const activeLeads = await db.collection('campaignprospects').countDocuments({ campaign: campaignId, v2State: { $nin: ['bounced', 'failed', 'stopped', 'completed'] } });
    
    // 3. Today's Sends (roughly)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sendsToday = await db.collection('enginelogs').countDocuments({
      campaign: campaignId,
      action: 'email_sent',
      timestamp: { $gte: today }
    });

    console.log("--- PROSPECT ---");
    console.log(JSON.stringify(campaignProspect, null, 2));
    console.log("\n--- CAMPAIGN STATS ---");
    console.log(`Total Leads: ${totalLeads}`);
    console.log(`Active Leads (V2): ${activeLeads}`);
    console.log(`Sends Today: ${sendsToday}`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
check();
