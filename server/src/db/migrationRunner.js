import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../../supabase/migrations');

/**
 * Programmatic migration runner with versioning.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * Each migration lives in a numbered directory with up.sql and down.sql.
 * Example: server/supabase/migrations/001_initial_schema/up.sql
 */
export class MigrationRunner {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /** Ensure the schema_migrations tracking table exists. */
  async ensureMigrationsTable() {
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          checksum TEXT NOT NULL
        );
      `,
    }).maybeSingle();

    // If RPC doesn't exist, fall back to raw SQL via REST
    if (error?.message?.includes('function') || error?.code === '42883') {
      // Use the SQL editor approach — create via a simple query
      await this.supabase.from('schema_migrations').select('version').limit(0).catch(async () => {
        // Table doesn't exist yet — we need to create it via the provided supabase client
        // Since we can't run raw DDL via PostgREST, rely on the table already existing
        // or being created by the first migration (001)
        console.warn('schema_migrations table may need to be created manually.');
        console.warn('Run this SQL in your Supabase dashboard:');
        console.warn(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT NOT NULL
);`);
      });
    }
  }

  /** Get list of applied migration versions from the DB. */
  async getAppliedMigrations() {
    const { data, error } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      throw new Error(`Failed to read schema_migrations: ${error.message}`);
    }
    return data || [];
  }

  /** Discover migration directories on disk, sorted by version. */
  discoverMigrations() {
    const entries = readdirSync(MIGRATIONS_DIR).filter((entry) => {
      const fullPath = join(MIGRATIONS_DIR, entry);
      return statSync(fullPath).isDirectory() && /^\d{3}_/.test(entry);
    });

    return entries.sort().map((dir) => {
      const version = dir.split('_')[0]; // e.g. "001"
      const name = dir; // e.g. "001_initial_schema"
      const upPath = join(MIGRATIONS_DIR, dir, 'up.sql');
      const downPath = join(MIGRATIONS_DIR, dir, 'down.sql');

      let upSql, downSql;
      try {
        upSql = readFileSync(upPath, 'utf-8');
      } catch {
        throw new Error(`Missing up.sql for migration ${dir}`);
      }
      try {
        downSql = readFileSync(downPath, 'utf-8');
      } catch {
        downSql = null; // down.sql is optional (but recommended)
      }

      const checksum = createHash('md5').update(upSql).digest('hex');

      return { version, name, upSql, downSql, checksum };
    });
  }

  /** Show status of all migrations (applied vs pending). */
  async status() {
    const applied = await this.getAppliedMigrations();
    const discovered = this.discoverMigrations();
    const appliedVersions = new Map(applied.map((m) => [m.version, m]));

    const rows = discovered.map((m) => {
      const dbRecord = appliedVersions.get(m.version);
      const status = dbRecord ? 'applied' : 'pending';
      const checksumMatch = dbRecord ? dbRecord.checksum === m.checksum : null;
      return {
        version: m.version,
        name: m.name,
        status,
        applied_at: dbRecord?.applied_at || null,
        checksum_ok: checksumMatch,
      };
    });

    return rows;
  }

  /** Apply all pending migrations (or up to a specific version). */
  async up(targetVersion = null) {
    await this.ensureMigrationsTable();

    const applied = await this.getAppliedMigrations();
    const discovered = this.discoverMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));

    const pending = discovered.filter((m) => {
      if (appliedVersions.has(m.version)) return false;
      if (targetVersion && m.version > targetVersion) return false;
      return true;
    });

    if (pending.length === 0) {
      return { applied: [], message: 'No pending migrations.' };
    }

    const results = [];
    for (const migration of pending) {
      console.log(`Applying migration ${migration.name}...`);

      // Execute the up.sql via Supabase rpc or direct query
      const { error } = await this.supabase.rpc('exec_sql', {
        sql: migration.upSql,
      }).maybeSingle();

      if (error) {
        throw new Error(`Migration ${migration.name} failed: ${error.message}`);
      }

      // Record in tracking table
      const { error: trackError } = await this.supabase
        .from('schema_migrations')
        .insert({
          version: migration.version,
          name: migration.name,
          checksum: migration.checksum,
        });

      if (trackError) {
        throw new Error(`Failed to record migration ${migration.name}: ${trackError.message}`);
      }

      console.log(`  ✓ ${migration.name} applied`);
      results.push({ version: migration.version, name: migration.name });
    }

    // Reload PostgREST schema cache so new columns/views are immediately visible
    if (results.length > 0) {
      await this.supabase.rpc('exec_sql', {
        sql: "NOTIFY pgrst, 'reload schema'",
      }).maybeSingle();
      console.log('  ✓ PostgREST schema cache reloaded');
    }

    return { applied: results, message: `${results.length} migration(s) applied.` };
  }

  /** Revert the last applied migration (or down to a specific version). */
  async down(targetVersion = null) {
    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      return { reverted: [], message: 'No migrations to revert.' };
    }

    const discovered = this.discoverMigrations();
    const migrationMap = new Map(discovered.map((m) => [m.version, m]));

    // Determine which migrations to revert
    let toRevert;
    if (targetVersion) {
      // Revert all migrations newer than targetVersion, newest first
      toRevert = applied
        .filter((m) => m.version > targetVersion)
        .sort((a, b) => b.version.localeCompare(a.version));
    } else {
      // Revert only the last applied migration
      toRevert = [applied[applied.length - 1]];
    }

    if (toRevert.length === 0) {
      return { reverted: [], message: 'Nothing to revert.' };
    }

    const results = [];
    for (const record of toRevert) {
      const migration = migrationMap.get(record.version);
      if (!migration) {
        throw new Error(`Migration files not found for version ${record.version} (${record.name})`);
      }
      if (!migration.downSql) {
        throw new Error(`No down.sql found for ${record.name} — cannot revert`);
      }

      console.log(`Reverting migration ${record.name}...`);

      const { error } = await this.supabase.rpc('exec_sql', {
        sql: migration.downSql,
      }).maybeSingle();

      if (error) {
        throw new Error(`Revert of ${record.name} failed: ${error.message}`);
      }

      // Remove from tracking table
      const { error: deleteError } = await this.supabase
        .from('schema_migrations')
        .delete()
        .eq('version', record.version);

      if (deleteError) {
        throw new Error(`Failed to remove migration record ${record.name}: ${deleteError.message}`);
      }

      console.log(`  ✓ ${record.name} reverted`);
      results.push({ version: record.version, name: record.name });
    }

    return { reverted: results, message: `${results.length} migration(s) reverted.` };
  }
}
