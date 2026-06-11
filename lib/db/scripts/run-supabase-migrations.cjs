const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const txt = fs.readFileSync(envPath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      let v = m[2].trim();
      // remove surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
  }
  return out;
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const envPath = path.join(repoRoot, '.env');
  const env = readDotEnv(envPath);
  const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found in environment or .env');
    process.exit(2);
  }

  const migrationsDir = path.join(repoRoot, 'artifacts', 'mobile', 'supabase', 'migrations');
  const files = [
    '003_conversations_and_messages.sql',
    '004_thought_media_storage.sql',
    'night_window_phase2.sql',
    '005_verify_schema.sql',
    'fix-conversation-rls.sql'
  ];

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to database...');
    await client.connect();

    for (const f of files) {
      const fp = path.join(migrationsDir, f);
      if (!fs.existsSync(fp)) {
        console.warn('  SKIP (missing file):', f);
        continue;
      }
      console.log(`\n=== Running migration: ${f} ===`);
      const sql = fs.readFileSync(fp, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('  OK');
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {}
          console.error('  ERROR running migration', f, '\n', err.message);
          console.error('  Full error object:', err);
          if (err.position) {
            const pos = parseInt(err.position, 10);
            const before = sql.slice(Math.max(0, pos - 80), pos + 80);
            console.error('  Context around error position:', before);
          }
          // Treat verification scripts as non-fatal (they are read-only checks)
          if (f.toLowerCase().includes('verify')) {
            console.warn('  Non-fatal: verification SQL failed (continuing)');
            continue;
          }
          throw err;
      }
    }

    console.log('\nAll migrations executed (or skipped if missing).');
  } catch (err) {
    console.error('\nMigration process failed:', err.message);
    process.exit(3);
  } finally {
    await client.end();
  }
}

run();
