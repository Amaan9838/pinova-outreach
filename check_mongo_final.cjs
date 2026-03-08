const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
const fs = require('fs');
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No Mongo URI");
  
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    // Find base prospect
    const baseProspect = await db.collection('prospects').findOne({ email: 'mtwebsite1@gmail.com' });
    if (!baseProspect) {
      fs.writeFileSync('C:/tmp/prospect.json', JSON.stringify({ error: "Base prospect not found" }));
      return;
    }

    // Find campaign prospect
    const prospect = await db.collection('campaignprospects').findOne({
      campaign: new ObjectId('69a80e78f5366ce2334bda1f'),
      prospect: baseProspect._id
    });
    
    fs.writeFileSync('C:/tmp/prospect.json', JSON.stringify(prospect, null, 2));
    console.log("Written to C:/tmp/prospect.json");
  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
check();
