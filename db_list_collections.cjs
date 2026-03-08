const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); 
require('dotenv').config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
const { MongoClient } = require('mongodb');

async function list() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log("COLLECTIONS:");
    console.log(collections.map(c => c.name).join('\n'));
  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
list();
