#!/usr/bin/env node
/**
 * Apply the Overthinkers database schema to your Supabase project.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres:[password]@db.vetsoqafwwdkzrwqwcqa.supabase.co:5432/postgres" \
 *   node scripts/apply-schema.js
 *
 * OR — simply copy/paste supabase/schema.sql into your Supabase SQL Editor at:
 *   https://supabase.com/dashboard/project/vetsoqafwwdkzrwqwcqa/sql/new
 */

const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║          OVERTHINKERS — DATABASE SETUP INSTRUCTIONS          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("To set up the Supabase database, run this SQL in your dashboard:\n");
  console.log("  1. Go to: https://supabase.com/dashboard/project/vetsoqafwwdkzrwqwcqa/sql/new");
  console.log("  2. Paste the contents of: supabase/schema.sql");
  console.log("  3. Click 'Run'\n");
  console.log("OR run this script with your DB connection string:");
  console.log('  SUPABASE_DB_URL="postgresql://postgres:[password]@db.vetsoqafwwdkzrwqwcqa.supabase.co:5432/postgres" node scripts/apply-schema.js\n');
  process.exit(0);
}

async function run() {
  try {
    const { Client } = require("pg");
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    console.log("Connected to database. Applying schema...");
    await client.query(sql);
    console.log("✓ Schema applied successfully!");
    await client.end();
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
}

run();
