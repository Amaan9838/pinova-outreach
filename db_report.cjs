const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
const fs = require('fs');
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function report() {
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

    // 2. Campaign Info
    const campaign = await db.collection('campaigns').findOne({ _id: campaignId });

    // 3. Status Counts
    const statusCounts = await db.collection('campaignprospects').aggregate([
      { $match: { campaign: campaignId } },
      { $group: { _id: "$v2State", count: { $sum: 1 } } }
    ]).toArray();

    // 4. Logs
    const recentLogs = await db.collection('enginelogs').find({ campaign: campaignId })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    const fullReport = {
      timestamp: new Date().toISOString(),
      campaignId: '69a80e78f5366ce2334bda1f',
      targetLead: {
        email,
        details: campaignProspect
      },
      campaignSettings: {
        status: campaign?.status,
        useV2Engine: campaign?.useV2Engine,
        v2Delays: campaign?.v2Delays,
        v2Timezone: campaign?.v2Timezone,
        scheduling: campaign?.scheduling
      },
      v2StateDistribution: statusCounts,
      recentLogs
    };

    fs.writeFileSync('C:/tmp/campaign_full_report.json', JSON.stringify(fullReport, null, 2));
    console.log("Full report written to C:/tmp/campaign_full_report.json");

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
report();
