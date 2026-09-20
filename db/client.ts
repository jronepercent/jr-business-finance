import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  var __plPool: Pool | undefined;
  var __plPoolConnectionString: string | undefined;
}

function getPool() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is not set");

  if (!global.__plPool || global.__plPoolConnectionString !== connectionString) {
    void global.__plPool?.end().catch(() => undefined);
    global.__plPool = new Pool({ connectionString, max: 3 });
    global.__plPoolConnectionString = connectionString;
  }
  return global.__plPool;
}

export const db = drizzle({ client: getPool(), schema });
