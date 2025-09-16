import mongoose from 'mongoose';
import Campaign from '../../models/Campaign.js';
import CampaignProspect from '../../models/CampaignProspect.js';
// import EmailAccount from '../../models/EmailAccount.js';
import MailboxService from '../services/MailboxService.js';

/**
 * Database Migration Utility
 * Handles migration of existing campaign data to work with the unified system
 */
class DataMigration {
  constructor() {
    this.migrationResults = {
      campaigns: { processed: 0, migrated: 0, errors: [] },
      prospects: { processed: 0, migrated: 0, errors: [] },
      mailboxes: { processed: 0, migrated: 0, errors: [] },
      scheduling: { campaignsUpdated: 0, prospectsUpdated: 0, errors: [] }
    };
  }

  /**
   * Run all migrations in sequence
   */
  async runAllMigrations(options = {}) {
    const { 
      batchSize = 20, 
      dryRun = false, 
      skipBackup = false 
    } = options;

    console.log('🚀 Starting data migration process...');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    
    if (!skipBackup && !dryRun) {
      await this.createBackup();
    }

    try {
      // Migrate mailbox references
      console.log('\n📧 Migrating mailbox references...');
      await this.migrateMailboxReferences(batchSize, dryRun);

      // Clean up scheduling data
      console.log('\n🗑️ Cleaning up scheduling data...');
      await this.cleanupSchedulingData(batchSize, dryRun);

      console.log('\n✅ Migration completed successfully!');

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Create backup of critical collections
   */
  async createBackup() {
    console.log('💾 Creating backup of critical collections...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPrefix = `backup_${timestamp}`;

    try {
      // Copy critical collections
      const collections = ['campaigns', 'campaignprospects', 'emailaccounts'];
      
      for (const collection of collections) {
        const backupName = `${backupPrefix}_${collection}`;
        await mongoose.connection.db.collection(collection).aggregate([
          { $out: backupName }
        ]).toArray();
        
        console.log(`✓ Backed up ${collection} to ${backupName}`);
      }

      console.log(`✅ Backup completed with prefix: ${backupPrefix}`);
      
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate mailbox references using MailboxService
   */
  async migrateMailboxReferences(batchSize, dryRun) {
    try {
      const result = await MailboxService.migrateLegacyReferences(batchSize);
      
      this.migrationResults.mailboxes = {
        processed: result.processed,
        migrated: result.migrated,
        errors: result.errors
      };

      console.log(`✓ Mailbox references: ${result.migrated}/${result.processed} campaigns updated`);
      
    } catch (error) {
      console.error('❌ Mailbox migration failed:', error.message);
      this.migrationResults.mailboxes.errors.push({ error: error.message });
    }
  }

  /**
   * Clean up scheduling-related data from campaigns and prospects
   */
  async cleanupSchedulingData(batchSize, dryRun) {
    try {
      let campaignsUpdated = 0;
      let prospectsUpdated = 0;

      // Clean up Campaign scheduling fields
      const campaignsWithScheduling = await Campaign.find({
        $or: [
          { 'settings': { $exists: true } },
          { 'prospects.nextSendAt': { $exists: true } },
          { 'sequence.waitHours': { $exists: true } },
          { 'sequence.waitMinutes': { $exists: true } }
        ]
      }).limit(batchSize);

      for (const campaign of campaignsWithScheduling) {
        let updated = false;

        // Remove settings object
        if (campaign.settings) {
          if (!dryRun) {
            campaign.settings = undefined;
          }
          updated = true;
        }

        // Remove nextSendAt from prospects
        if (campaign.prospects && campaign.prospects.length > 0) {
          campaign.prospects.forEach(prospect => {
            if (prospect.nextSendAt) {
              if (!dryRun) {
                prospect.nextSendAt = undefined;
              }
              updated = true;
            }
          });
        }

        // Remove waitHours and waitMinutes from sequence steps
        if (campaign.sequence && campaign.sequence.length > 0) {
          campaign.sequence.forEach(step => {
            if (step.waitHours !== undefined || step.waitMinutes !== undefined) {
              if (!dryRun) {
                step.waitHours = undefined;
                step.waitMinutes = undefined;
              }
              updated = true;
            }
          });
        }

        if (updated) {
          if (!dryRun) {
            await campaign.save();
          }
          campaignsUpdated++;
        }
      }

      // Clean up CampaignProspect scheduling fields
      const prospectsWithScheduling = await CampaignProspect.find({
        nextSendAt: { $exists: true }
      }).limit(batchSize);

      for (const prospect of prospectsWithScheduling) {
        if (!dryRun) {
          prospect.nextSendAt = undefined;
          await prospect.save();
        }
        prospectsUpdated++;
      }

      this.migrationResults.scheduling = {
        campaignsUpdated,
        prospectsUpdated,
        errors: []
      };

      console.log(`✓ Scheduling cleanup: ${campaignsUpdated} campaigns, ${prospectsUpdated} prospects updated`);

    } catch (error) {
      console.error('❌ Scheduling cleanup failed:', error.message);
      this.migrationResults.scheduling = {
        campaignsUpdated: 0,
        prospectsUpdated: 0,
        errors: [{ error: error.message }]
      };
    }
  }

  /**
                  updatedAt: new Date()
                });
              }
              
              created++;
              console.log(`✓ Created scheduled email for prospect ${prospect.prospect}`);
            }
            
          } catch (error) {
            console.error(`❌ Error creating scheduled email for prospect ${prospect._id}:`, error.message);
            errors.push({
              prospectId: prospect._id,
              error: error.message
            });
          }
          processed++;
        }
      }

      console.log(`✓ Scheduled emails: ${created} records created from ${processed} prospects`);

    } catch (error) {
      console.error('❌ Scheduled email creation failed:', error.message);
    }
  }

  /**
   * Validate migration results and data integrity
   */
  async validateMigration() {
    const issues = [];

    // Check for remaining scheduling data
    const campaignsWithScheduling = await Campaign.countDocuments({
      $or: [
        { 'settings': { $exists: true } },
        { 'prospects.nextSendAt': { $exists: true } },
        { 'sequence.waitHours': { $exists: true } },
        { 'sequence.waitMinutes': { $exists: true } }
      ]
    });

    if (campaignsWithScheduling > 0) {
      issues.push(`${campaignsWithScheduling} campaigns still have scheduling data`);
    }

    const prospectsWithScheduling = await CampaignProspect.countDocuments({
      nextSendAt: { $exists: true }
    });

    if (prospectsWithScheduling > 0) {
      issues.push(`${prospectsWithScheduling} prospects still have scheduling data`);
    }

    // Check for campaigns with invalid status
    const campaignsWithInactive = await Campaign.aggregate([
      {
        $lookup: {
          from: 'mailboxes',
          localField: 'mailboxes',
          foreignField: '_id',
          as: 'mailboxData'
        }
      },
      {
        $match: {
          status: 'active',
          $or: [
            { 'mailboxData.status': { $ne: 'active' } },
            { mailboxData: { $size: 0 } }
          ]
        }
      },
      {
        $count: 'invalid'
      }
    ]);

    const invalid = campaignsWithInactive[0]?.invalid || 0;
    if (invalid > 0) {
      issues.push(`${invalid} campaigns reference inactive/missing mailboxes`);
    }

    return {
      valid: issues.length === 0,
      message: issues.length === 0 ? 'All data is valid' : `${issues.length} issues found`,
      issues
    };
  }

  /**
   * Print migration summary
   */
  printMigrationSummary() {
    console.log('\n📋 Migration Summary:');
    console.log('=====================================');
    
    Object.entries(this.migrationResults).forEach(([type, result]) => {
      console.log(`\n${type.toUpperCase()}:`);
      console.log(`  Processed: ${result.processed}`);
      console.log(`  Migrated: ${result.migrated}`);
      console.log(`  Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0 && result.errors.length <= 5) {
        result.errors.forEach(error => {
          console.log(`    - ${error.campaignId || error.prospectId || 'Unknown'}: ${error.error}`);
        });
      } else if (result.errors.length > 5) {
        console.log(`    - (${result.errors.length} errors - check logs for details)`);
      }
    });

    const totalProcessed = Object.values(this.migrationResults).reduce((sum, r) => sum + r.processed, 0);
    const totalMigrated = Object.values(this.migrationResults).reduce((sum, r) => sum + r.migrated, 0);
    const totalErrors = Object.values(this.migrationResults).reduce((sum, r) => sum + r.errors.length, 0);

    console.log('\n=====================================');
    console.log(`TOTAL PROCESSED: ${totalProcessed}`);
    console.log(`TOTAL MIGRATED: ${totalMigrated}`);
    console.log(`TOTAL ERRORS: ${totalErrors}`);
    console.log('=====================================\n');
  }

  /**
   * Export migration results to file
   */
  async exportResults(filename) {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      results: this.migrationResults,
      validation: await this.validateMigration()
    };

    const exportPath = path.default.join(process.cwd(), filename || 'migration_results.json');
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`✓ Migration results exported to ${exportPath}`);
  }
}

export default DataMigration;
