import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  var __plPool: Pool | undefined;
}

function getPool() {
  if (!global.__plPool) {
    global.__plPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return global.__plPool;
}

export const db = drizzle({ client: getPool(), schema });
