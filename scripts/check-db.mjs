import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Database check failed: DIRECT_URL or DATABASE_URL is not set.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(connectionString);
} catch {
  console.error("Database check failed: connection string is not a valid URL.");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });

try {
  await pool.query("select 1");
  console.log(`Database check passed: connected to ${parsed.hostname}.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Database check failed.");

  if (message.includes("tenant/user") || message.includes("ENOTFOUND")) {
    console.error(
      "Connection string points to a database host or Supabase project that is not reachable. Copy a fresh DIRECT_URL from Supabase and set the same value in Vercel.",
    );
  } else {
    console.error(message);
  }

  process.exit(1);
} finally {
  await pool.end().catch(() => undefined);
}
