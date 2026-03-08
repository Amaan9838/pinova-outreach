const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    // Convert to ObjectId since campaign ID is usually stored as ObjectId if it's referenced,
    // though it might be a string. Let's try both or just ObjectId.
    const prospect = await db.collection('campaignprospects').findOne({
      campaign: new ObjectId('69a80e78f5366ce2334bda1f'),
      email: 'mtwebsite1@gmail.com'
    });
    
    console.log("PROSPECT:");
    console.log(JSON.stringify(prospect, null, 2));

    const campaign = await db.collection('campaigns').findOne({
      _id: new ObjectId('69a80e78f5366ce2334bda1f')
    });
    console.log("CAMPAIGN v2Delays & Status:");
    console.log(JSON.stringify(campaign?.v2Delays || {}, null, 2));
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
check();
