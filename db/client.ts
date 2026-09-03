import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  var __plPool: Pool | undefined;
}

function getPool() {
  if (!global.__plPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    global.__plPool = new Pool({ connectionString, max: 3 });
  }
  return global.__plPool;
}

export const db = drizzle({ client: getPool(), schema });
