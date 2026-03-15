const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '.env.local'),'utf8');
const uri = env.match(/MONGODB_URI=(.*)/)?.[1];

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  
  // Check all mailboxes
  const mboxes = await db.collection('mailboxes').find({}, {projection:{fromEmail:1, status:1}}).toArray();
  console.log('=== All Mailboxes ===');
  console.log(JSON.stringify(mboxes, null, 2));
  
  // Check CampaignProspects with repliedAt set
  const ghostReplies = await db.collection('campaignprospects').find(
    {repliedAt: {$ne: null}}, 
    {projection:{campaign:1, status:1, v2State:1, repliedAt:1}}
  ).toArray();
  console.log('\n=== CampaignProspects with repliedAt ===');
  console.log(JSON.stringify(ghostReplies, null, 2));
  
  // Check Messages with replied status  
  const replyMsgs = await db.collection('messages').find(
    {status:'replied'}, 
    {projection:{campaignId:1, status:1, subject:1, createdAt:1, prospectId:1}}
  ).limit(10).toArray();
  console.log('\n=== Messages with replied status ===');
  console.log(JSON.stringify(replyMsgs, null, 2));

  // Check campaigns to match IDs
  const campaigns = await db.collection('campaigns').find({}, {projection:{name:1}}).toArray();
  console.log('\n=== Campaigns ===');
  console.log(JSON.stringify(campaigns, null, 2));
  
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
