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
    console.error('DATABASE_URL not found');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tablesToCheck = [
    'conversations',
    'messages',
    'thought_media',
    'thought_media',
    'night_windows',
    'night_activity',
    'night_streaks',
    'night_badges'
  ];

  for (const t of tablesToCheck) {
    const tableExistsRes = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
      [t]
    );
    const exists = tableExistsRes.rows[0].exists;
    console.log(`Table ${t}: ${exists ? 'FOUND' : 'MISSING'}`);

    if (exists) {
      // RLS policies
      const policies = await client.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 ORDER BY policyname`,
        [t]
      );
      console.log(`  Policies: ${policies.rows.map(r => r.policyname).join(', ') || '(none)'}`);

      // Publication membership
      const pub = await client.query(
        `SELECT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = $1) as in_pub`,
        [t]
      );
      console.log(`  In publication supabase_realtime: ${pub.rows[0].in_pub ? 'YES' : 'NO'}`);
    }
  }

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
