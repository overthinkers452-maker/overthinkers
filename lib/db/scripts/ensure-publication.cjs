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

  const tables = ['conversations', 'night_activity'];
  for (const t of tables) {
    const res = await client.query(
      `SELECT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = $1) as in_pub`,
      [t]
    );
    const inPub = res.rows[0].in_pub;
    if (inPub) {
      console.log(`${t}: already in publication`);
      continue;
    }
    const doSql = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = '${t}') THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.${t}'; END IF; END; $$;`;
    try {
      await client.query('BEGIN');
      await client.query(doSql);
      await client.query('COMMIT');
      console.log(`${t}: added to publication`);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      console.error(`${t}: failed to add to publication:`, err.message);
    }
  }

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
