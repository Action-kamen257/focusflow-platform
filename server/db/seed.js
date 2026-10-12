/**
 * Seed Script — Import existing users.json data into SQLite
 * 
 * Usage: npm run seed
 * 
 * This is automatically handled by the database init, but can be
 * run manually to force a re-import.
 */

const { initDatabase } = require('./index');

async function seed() {
  console.log('🌱 Running database seed...');
  await initDatabase();
  console.log('✓ Database initialized and seeded successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
