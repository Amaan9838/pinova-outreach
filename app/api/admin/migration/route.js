import dbConnect from '../../../../lib/mongodb.js';
import DataMigration from '../../../../lib/migrations/DataMigration.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { 
      dryRun = true, 
      batchSize = 20, 
      skipBackup = false,
      validateOnly = false 
    } = await request.json();

    console.log('🚀 Starting migration process...');
    console.log(`Options:`, { dryRun, batchSize, skipBackup, validateOnly });

    const migration = new DataMigration();

    if (validateOnly) {
      // Only run validation
      console.log('🔍 Running validation only...');
      const validation = await migration.validateMigration();
      
      return Response.json({
        success: true,
        message: 'Validation completed',
        validation
      });
    }

    // Run full migration
    await migration.runAllMigrations({
      batchSize,
      dryRun,
      skipBackup
    });

    // Run validation after migration
    const validation = await migration.validateMigration();

    return Response.json({
      success: true,
      message: dryRun ? 'Dry run completed successfully' : 'Migration completed successfully',
      results: migration.migrationResults,
      validation
    });

  } catch (error) {
    console.error('❌ Migration API error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Migration failed: ' + error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    console.log('🔍 Running migration validation...');
    
    const migration = new DataMigration();
    const validation = await migration.validateMigration();
    
    return Response.json({
      success: true,
      message: 'Migration validation completed',
      validation
    });

  } catch (error) {
    console.error('❌ Validation error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Validation failed: ' + error.message 
      },
      { status: 500 }
    );
  }
}
