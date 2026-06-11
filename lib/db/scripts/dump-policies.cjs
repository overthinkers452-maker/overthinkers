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

  const tables = ['messages', 'conversations', 'night_activity'];
  for (const t of tables) {
    console.log('\nPolicies for', t);
    try {
      const res = await client.query("SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = $1 ORDER BY policyname", [t]);
      if (res.rows.length === 0) console.log('  (none)');
      for (const r of res.rows) {
        console.log('  -', r.policyname, '| cmd=', r.cmd, '| roles=', r.roles, '| qual=', r.qual, '| with_check=', r.with_check);
      }
    } catch (err) {
      console.error('  Error reading policies for', t, err.message);
    }
  }

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
