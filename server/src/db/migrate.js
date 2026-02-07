#!/usr/bin/env node

/**
 * CLI entry point for database migrations.
 *
 * Usage:
 *   node src/db/migrate.js up              # Apply all pending migrations
 *   node src/db/migrate.js up 002          # Apply up to version 002
 *   node src/db/migrate.js down            # Revert last applied migration
 *   node src/db/migrate.js down 001        # Revert down to version 001
 *   node src/db/migrate.js status          # Show migration status
 */

import { MigrationRunner } from './migrationRunner.js';
import { supabase } from './supabase.js';

const runner = new MigrationRunner(supabase);
const [command, targetVersion] = process.argv.slice(2);

async function main() {
  try {
    switch (command) {
      case 'up': {
        const result = await runner.up(targetVersion || null);
        console.log(`\n${result.message}`);
        if (result.applied.length > 0) {
          result.applied.forEach((m) => console.log(`  ${m.version} - ${m.name}`));
        }
        break;
      }

      case 'down': {
        const result = await runner.down(targetVersion || null);
        console.log(`\n${result.message}`);
        if (result.reverted.length > 0) {
          result.reverted.forEach((m) => console.log(`  ${m.version} - ${m.name}`));
        }
        break;
      }

      case 'status': {
        const rows = await runner.status();
        if (rows.length === 0) {
          console.log('No migrations found.');
          break;
        }
        console.log('\nMigration Status:');
        console.log('─'.repeat(70));
        for (const row of rows) {
          const icon = row.status === 'applied' ? '✓' : '○';
          const checksum = row.checksum_ok === false ? ' [CHECKSUM MISMATCH]' : '';
          const date = row.applied_at ? ` (${new Date(row.applied_at).toLocaleString()})` : '';
          console.log(`  ${icon} ${row.version} - ${row.name}  ${row.status}${date}${checksum}`);
        }
        console.log('─'.repeat(70));
        break;
      }

      default:
        console.error('Usage: node src/db/migrate.js <up|down|status> [version]');
        process.exit(1);
    }
  } catch (err) {
    console.error('\nMigration error:', err.message);
    process.exit(1);
  }
}

main();
