import dotenv from 'dotenv';
dotenv.config({ path: 'c:/CODING PHP/htdocs/pinova-outreach/.env' });
import mongoose from 'mongoose';
import dbConnect from './lib/mongodb.js';

// Setup basic models needed
if (!mongoose.models.CampaignProspect) {
  mongoose.model('CampaignProspect', new mongoose.Schema({}, { strict: false }));
}
if (!mongoose.models.Campaign) {
  mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));
}

async function check() {
  try {
    console.log("Connecting...");
    await dbConnect();
    console.log("Connected.");
    
    console.log("Fetching prospect mtwebsite1@gmail.com...");
    const Prospect = mongoose.models.CampaignProspect;
    const prospect = await Prospect.findOne({
      campaign: new mongoose.Types.ObjectId('69a80e78f5366ce2334bda1f'),
      email: 'mtwebsite1@gmail.com'
    }).lean();
    
    console.log("PROSPECT:");
    console.log(JSON.stringify(prospect, null, 2));

    const Campaign = mongoose.models.Campaign;
    const campaign = await Campaign.findById('69a80e78f5366ce2334bda1f').lean();
    console.log("CAMPAIGN v2Delays & Status:");
    console.log(JSON.stringify(campaign?.v2Delays || {}, null, 2));
    
  } catch(e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}
check();
