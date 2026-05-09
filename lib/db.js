import pg from "pg";

const { Pool } = pg;

const globalForPg = globalThis;

export function getPool() {
  const connectionString =
    process.env.POSTGRES_SESSION_POOL_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing POSTGRES_SESSION_POOL_URL, POSTGRES_URL, or DATABASE_URL environment variable.",
    );
  }

  if (!globalForPg.postgresPool) {
    globalForPg.postgresPool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
    });
  }

  return globalForPg.postgresPool;
}
