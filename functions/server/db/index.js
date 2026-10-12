/**
 * Database Layer — SQLite via sql.js
 * 
 * Replaces the old users.json file-based storage with a proper
 * relational database. Static content (courses, news, meditation,
 * rewards) remains in JSON files since they are read-only reference data.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const initSqlJs = require('sql.js');

const isServerless = process.env.NODE_ENV === 'production' || !!process.env.FUNCTION_TARGET || !!process.env.K_SERVICE;
const BUNDLED_DB_PATH = path.join(__dirname, '..', 'data', 'focusflow.db');
const DB_PATH = isServerless ? path.join(os.tmpdir(), 'focusflow.db') : BUNDLED_DB_PATH;
const USERS_JSON_PATH = path.join(__dirname, '..', 'data', 'users.json');

let db = null;

/**
 * Initialize the database connection and create tables if they don't exist.
 * Automatically migrates data from users.json on first run.
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // If running in serverless and DB file doesn't exist in tmpdir, copy bundled DB to tmpdir
  if (isServerless && !fs.existsSync(DB_PATH) && fs.existsSync(BUNDLED_DB_PATH)) {
    try {
      fs.copyFileSync(BUNDLED_DB_PATH, DB_PATH);
    } catch (e) {
      console.warn('Could not copy bundled DB to temp directory:', e.message);
    }
  }

  // Load existing DB file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      coins INTEGER DEFAULT 50,
      streak INTEGER DEFAULT 0,
      last_active TEXT,
      enrolled_courses TEXT DEFAULT '[]',
      completed_modules TEXT DEFAULT '[]',
      read_news TEXT DEFAULT '[]',
      completed_meditations TEXT DEFAULT '[]',
      coin_history TEXT DEFAULT '[]',
      redemptions TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `);

  // Auto-migrate from users.json if DB is empty and JSON exists
  const count = db.exec("SELECT COUNT(*) as cnt FROM users");
  const userCount = count[0]?.values[0]?.[0] || 0;

  if (userCount === 0 && fs.existsSync(USERS_JSON_PATH)) {
    console.log('  ℹ Migrating existing users from users.json → SQLite...');
    const users = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf-8'));
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users 
      (id, name, email, password, coins, streak, last_active, 
       enrolled_courses, completed_modules, read_news, 
       completed_meditations, coin_history, redemptions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of users) {
      stmt.run([
        u.id,
        u.name,
        u.email,
        u.password,
        u.coins || 50,
        u.streak || 0,
        u.lastActive || new Date().toISOString().split('T')[0],
        JSON.stringify(u.enrolledCourses || []),
        JSON.stringify(u.completedModules || []),
        JSON.stringify(u.readNews || []),
        JSON.stringify(u.completedMeditations || []),
        JSON.stringify(u.coinHistory || []),
        JSON.stringify(u.redemptions || []),
        u.createdAt || new Date().toISOString()
      ]);
    }
    stmt.free();
    persist();
    console.log(`  ✓ Migrated ${users.length} user(s) to SQLite.`);
  }

  return db;
}

/**
 * Write current in-memory DB state to disk.
 */
function persist() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.warn('DB persistence warning:', err.message);
  }
}

/**
 * Convert a raw DB row to the user object shape the API expects.
 * This ensures zero changes are needed on the frontend.
 */
function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    coins: row.coins,
    streak: row.streak,
    lastActive: row.last_active,
    enrolledCourses: JSON.parse(row.enrolled_courses || '[]'),
    completedModules: JSON.parse(row.completed_modules || '[]'),
    readNews: JSON.parse(row.read_news || '[]'),
    completedMeditations: JSON.parse(row.completed_meditations || '[]'),
    coinHistory: JSON.parse(row.coin_history || '[]'),
    redemptions: JSON.parse(row.redemptions || '[]'),
    createdAt: row.created_at
  };
}

// ─── Query Helpers ──────────────────────────────────────────

function getUserById(id) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  stmt.bind([id]);
  let user = null;
  if (stmt.step()) {
    user = rowToUser(stmt.getAsObject());
  }
  stmt.free();
  return user;
}

function getUserByEmail(email) {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  stmt.bind([email]);
  let user = null;
  if (stmt.step()) {
    user = rowToUser(stmt.getAsObject());
  }
  stmt.free();
  return user;
}

function createUser({ id, name, email, password, coins, streak, lastActive, enrolledCourses, completedModules, readNews, completedMeditations, coinHistory, redemptions, createdAt }) {
  db.run(
    `INSERT INTO users 
     (id, name, email, password, coins, streak, last_active, 
      enrolled_courses, completed_modules, read_news, 
      completed_meditations, coin_history, redemptions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, name, email, password,
      coins || 50,
      streak || 0,
      lastActive || new Date().toISOString().split('T')[0],
      JSON.stringify(enrolledCourses || []),
      JSON.stringify(completedModules || []),
      JSON.stringify(readNews || []),
      JSON.stringify(completedMeditations || []),
      JSON.stringify(coinHistory || []),
      JSON.stringify(redemptions || []),
      createdAt || new Date().toISOString()
    ]
  );
  persist();
  return getUserById(id);
}

function updateUser(id, fields) {
  const user = getUserById(id);
  if (!user) return null;

  // Merge fields into user
  const updated = { ...user, ...fields };

  db.run(
    `UPDATE users SET
       name = ?, email = ?, password = ?, coins = ?, streak = ?,
       last_active = ?, enrolled_courses = ?, completed_modules = ?,
       read_news = ?, completed_meditations = ?, coin_history = ?,
       redemptions = ?
     WHERE id = ?`,
    [
      updated.name,
      updated.email,
      updated.password,
      updated.coins,
      updated.streak,
      updated.lastActive,
      JSON.stringify(updated.enrolledCourses || []),
      JSON.stringify(updated.completedModules || []),
      JSON.stringify(updated.readNews || []),
      JSON.stringify(updated.completedMeditations || []),
      JSON.stringify(updated.coinHistory || []),
      JSON.stringify(updated.redemptions || []),
      id
    ]
  );
  persist();
  return getUserById(id);
}

module.exports = {
  initDatabase,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  persist
};
