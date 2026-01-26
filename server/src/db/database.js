import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data.db');

let db = null;

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Check if column exists in table
function columnExists(tableName, columnName) {
  try {
    const result = db.exec(`PRAGMA table_info(${tableName})`);
    if (result.length > 0) {
      const columns = result[0].values.map(row => row[1]);
      return columns.includes(columnName);
    }
    return false;
  } catch {
    return false;
  }
}

// Check if table exists
function tableExists(tableName) {
  try {
    const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    return result.length > 0 && result[0].values.length > 0;
  } catch {
    return false;
  }
}

// Run migrations for existing database
function runMigrations() {
  // Create comment_mentions table if not exists
  if (!tableExists('comment_mentions')) {
    console.log('Creating comment_mentions table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS comment_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(comment_id, user_id)
      )
    `);
  }

  // Add profile_picture column to users if not exists
  if (!columnExists('users', 'profile_picture')) {
    console.log('Adding profile_picture column to users table...');
    db.run("ALTER TABLE users ADD COLUMN profile_picture TEXT");
  }

  // Add theme_preference column to users if not exists
  if (!columnExists('users', 'theme_preference')) {
    console.log('Adding theme_preference column to users table...');
    db.run("ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'light'");
  }

  // Create verification_codes table if not exists
  if (!tableExists('verification_codes')) {
    console.log('Creating verification_codes table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT CHECK(type IN ('registration', 'password_change')),
        expires_at DATETIME NOT NULL,
        pending_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)');
  }

  // Add pending_data column to verification_codes if not exists
  if (tableExists('verification_codes') && !columnExists('verification_codes', 'pending_data')) {
    console.log('Adding pending_data column to verification_codes table...');
    db.run("ALTER TABLE verification_codes ADD COLUMN pending_data TEXT");
  }

  // Create pending_registrations table if not exists
  if (!tableExists('pending_registrations')) {
    console.log('Creating pending_registrations table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        verification_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email)');
  }

  // Add team column if not exists
  if (!columnExists('requests', 'team')) {
    console.log('Adding team column to requests table...');
    db.run("ALTER TABLE requests ADD COLUMN team TEXT DEFAULT 'Manufacturing'");
    // Propagate random teams to existing requests
    const teams = ['Manufacturing', 'Sales', 'Service', 'Energy'];
    const requests = db.exec('SELECT id FROM requests');
    if (requests.length > 0) {
      requests[0].values.forEach((row, index) => {
        const team = teams[index % teams.length];
        db.run('UPDATE requests SET team = ? WHERE id = ?', [team, row[0]]);
      });
    }
  }

  // Add region column if not exists
  if (!columnExists('requests', 'region')) {
    console.log('Adding region column to requests table...');
    db.run("ALTER TABLE requests ADD COLUMN region TEXT DEFAULT 'Global'");
    // Propagate random regions to existing requests
    const regions = ['EMEA', 'North America', 'APAC', 'Global'];
    const requests = db.exec('SELECT id FROM requests');
    if (requests.length > 0) {
      requests[0].values.forEach((row, index) => {
        const region = regions[index % regions.length];
        db.run('UPDATE requests SET region = ? WHERE id = ?', [region, row[0]]);
      });
    }
  }

  // Migration: Add 'archived' to status CHECK constraint
  // SQLite doesn't allow altering CHECK constraints, so we need to recreate the table
  // Check if migration is needed by trying to update a status to 'archived'
  try {
    // First check if there's any row we can test with, or just check the schema
    const schemaInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='requests'");
    if (schemaInfo.length > 0 && schemaInfo[0].values.length > 0) {
      const createStatement = schemaInfo[0].values[0][0];
      // Check if 'archived' is NOT in the constraint
      if (createStatement && !createStatement.includes("'archived'")) {
        console.log('Migrating requests table to add archived status...');

        // Create new table with correct constraint
        db.run(`
          CREATE TABLE requests_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('bug', 'new_feature', 'optimization')),
            priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'backlog', 'in_progress', 'completed', 'rejected', 'duplicate', 'archived')),
            team TEXT DEFAULT 'Manufacturing' CHECK(team IN ('Manufacturing', 'Sales', 'Service', 'Energy')),
            region TEXT DEFAULT 'Global' CHECK(region IN ('EMEA', 'North America', 'APAC', 'Global')),
            business_problem TEXT,
            problem_size TEXT,
            business_expectations TEXT,
            expected_impact TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // Copy data from old table
        db.run(`
          INSERT INTO requests_new
          SELECT id, user_id, title, category, priority, status, team, region,
                 business_problem, problem_size, business_expectations, expected_impact,
                 created_at, updated_at
          FROM requests
        `);

        // Drop old table
        db.run('DROP TABLE requests');

        // Rename new table
        db.run('ALTER TABLE requests_new RENAME TO requests');

        // Recreate indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category)');
        db.run('CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at)');

        console.log('Requests table migration completed.');
      }
    }
  } catch (err) {
    console.error('Error checking/migrating requests table:', err);
  }

  // Create activity_log table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create password_reset_tokens table if not exists
  if (!tableExists('password_reset_tokens')) {
    console.log('Creating password_reset_tokens table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)');
    db.run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)');
  }

  // Create roadmap_items table if not exists
  if (!tableExists('roadmap_items')) {
    console.log('Creating roadmap_items table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS roadmap_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority TEXT,
        team TEXT,
        region TEXT,
        column_status TEXT NOT NULL DEFAULT 'backlog'
          CHECK(column_status IN ('backlog', 'discovery', 'in_progress', 'released')),
        position INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_roadmap_items_column ON roadmap_items(column_status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_roadmap_items_request ON roadmap_items(request_id)');
  }

  // Add merged_into_id column to requests if not exists
  if (!columnExists('requests', 'merged_into_id')) {
    console.log('Adding merged_into_id column to requests table...');
    db.run("ALTER TABLE requests ADD COLUMN merged_into_id INTEGER REFERENCES requests(id)");
  }

  // Add is_discovery column to roadmap_items if not exists
  if (tableExists('roadmap_items') && !columnExists('roadmap_items', 'is_discovery')) {
    console.log('Adding is_discovery column to roadmap_items table...');
    db.run("ALTER TABLE roadmap_items ADD COLUMN is_discovery INTEGER DEFAULT 0");
    // Migrate existing discovery items
    db.run("UPDATE roadmap_items SET is_discovery = 1, column_status = 'backlog' WHERE column_status = 'discovery'");
  }

  // Create admin_read_requests table if not exists
  if (!tableExists('admin_read_requests')) {
    console.log('Creating admin_read_requests table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_read_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(request_id, admin_id)
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_admin_read_requests ON admin_read_requests(request_id, admin_id)');
  }
}

// Initialize database
export async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Run migrations for existing data
  runMigrations();

  // Seed admin user if not exists
  const adminCheck = db.exec("SELECT id FROM users WHERE email = 'admin@company.com'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
      ['admin@company.com', hashedPassword, 'Admin User', 'admin']
    );
    console.log('Admin user created: admin@company.com / admin123');
  }

  saveDatabase();
  console.log('Database initialized successfully');
}

// Helper to run queries
export function run(sql, params = []) {
  try {
    // Use prepared statement with proper binding
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();

    // Get last insert rowid immediately after the insert
    const lastIdResult = db.exec("SELECT last_insert_rowid()");
    const lastInsertRowid = lastIdResult.length > 0 ? Number(lastIdResult[0].values[0][0]) : 0;

    saveDatabase();
    return { lastInsertRowid };
  } catch (err) {
    console.error('DB run error:', err);
    throw err;
  }
}

// Helper to get single row
export function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    console.error('DB get error:', err);
    throw err;
  }
}

// Helper to get all rows
export function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('DB all error:', err);
    throw err;
  }
}

// Prepare statement helper (returns object with run, get, all methods)
export function prepare(sql) {
  return {
    run: (...params) => run(sql, params),
    get: (...params) => get(sql, params),
    all: (...params) => all(sql, params),
  };
}

export default { run, get, all, prepare };
