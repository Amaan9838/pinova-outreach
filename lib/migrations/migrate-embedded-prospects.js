// Migration script to move embedded prospects from Campaign.prospects to CampaignProspect model
// Run this once to migrate existing data

import dbConnect from '../mongodb.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspect from '../models/CampaignProspect.js';

async function migrateEmbeddedProspects() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Find all campaigns with embedded prospects
    const campaignsWithProspects = await Campaign.find({
      'prospects.0': { $exists: true }
    }).lean();

    console.log(`Found ${campaignsWithProspects.length} campaigns with embedded prospects`);

    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const campaignData of campaignsWithProspects) {
      const campaignId = campaignData._id;
      
      try {
        console.log(`Processing campaign: ${campaignData.name} (${campaignId})`);

        const embeddedProspects = campaignData.prospects || [];
        let migratedCount = 0;

        for (const embeddedProspect of embeddedProspects) {
          if (!embeddedProspect.prospectId) {
            console.warn(`Skipping prospect without ID in campaign ${campaignId}`);
            continue;
          }

          // Check if this prospect is already linked via CampaignProspect
          const existingLink = await CampaignProspect.findOne({
            campaign: campaignId,
            prospect: embeddedProspect.prospectId
          });

          if (existingLink) {
            console.log(`Prospect ${embeddedProspect.prospectId} already linked in campaign ${campaignId}`);
            totalSkipped++;
            continue;
          }

          // Verify the prospect exists
          const prospect = await Prospect.findById(embeddedProspect.prospectId);
          if (!prospect) {
            console.warn(`Prospect ${embeddedProspect.prospectId} not found, skipping`);
            continue;
          }

          // Create CampaignProspect entry
          const campaignProspect = new CampaignProspect({
            campaign: campaignId,
            prospect: embeddedProspect.prospectId,
            sequenceStep: embeddedProspect.currentStep || 1,
            status: embeddedProspect.status || 'pending',
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            emailsReplied: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await campaignProspect.save();
          migratedCount++;
          totalMigrated++;

          console.log(`Migrated prospect ${prospect.email} to CampaignProspect`);
        }

        // Clear the embedded prospects array from the campaign
        await Campaign.updateOne(
          { _id: campaignId },
          { 
            $set: { 
              prospects: [],
              prospectCount: (campaignData.prospectCount || 0) + migratedCount 
            }
          }
        );

        console.log(`Campaign ${campaignId} processed: ${migratedCount} prospects migrated`);

      } catch (campaignError) {
        console.error(`Error processing campaign ${campaignId}:`, campaignError);
        totalErrors++;
      }
    }

    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total campaigns processed: ${campaignsWithProspects.length}`);
    console.log(`Total prospects migrated: ${totalMigrated}`);
    console.log(`Prospects skipped (already linked): ${totalSkipped}`);
    console.log(`Errors encountered: ${totalErrors}`);

    // Verify migration
    const postMigrationCheck = await CampaignProspect.countDocuments();
    console.log(`Total CampaignProspect records after migration: ${postMigrationCheck}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateEmbeddedProspects()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });