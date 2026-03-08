const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
const fs = require('fs');
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkLogs() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    const campaignId = new ObjectId('69a80e78f5366ce2334bda1f');
    const leadId = new ObjectId('69a80ea1f5366ce2334bda3f');

    // Fetch logs for the specific lead to see why it skipped/delayed
    const logs = await db.collection('enginelogs').find({ leadId })
      .sort({ timestamp: -1 })
      .toArray();

    fs.writeFileSync('C:/tmp/lead_logs.json', JSON.stringify(logs, null, 2));
    console.log(`Fetched ${logs.length} logs for lead.`);

  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
checkLogs();
