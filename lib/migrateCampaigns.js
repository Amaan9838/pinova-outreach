// DEPRECATED: This file is no longer needed - scheduling system has been removed
// Campaigns now start sending emails immediately when prospects are added
// Use lib/migrations/DataMigration.js for database migrations instead

console.log('⚠️  This migration script is deprecated.');
console.log('📧 The scheduling system has been removed from Pinova Outreach.');
console.log('🔄 Use the new migration system: /api/admin/migration');
console.log('📖 See PHASE_2_IMPLEMENTATION_COMPLETE.md for migration guide.');

export default function deprecatedMigration() {
  throw new Error('This migration script is deprecated. Use /api/admin/migration instead.');
}
