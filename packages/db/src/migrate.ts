import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL nincs beállítva.");
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: join(__dirname, "..", "drizzle") });

  // Hand-written SQL (RLS policies etc.) that drizzle-kit doesn't generate. Tracked in
  // its own table so re-running this script (e.g. on every deploy) stays a no-op.
  await client.unsafe(
    `CREATE TABLE IF NOT EXISTS _custom_sql_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const appliedRows = await client.unsafe<{ filename: string }[]>(
    `SELECT filename FROM _custom_sql_migrations`,
  );
  const applied = new Set(appliedRows.map((row) => row.filename));

  const sqlDir = join(__dirname, "..", "sql");
  const sqlFiles = readdirSync(sqlDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of sqlFiles) {
    if (applied.has(file)) {
      continue;
    }
    const statement = readFileSync(join(sqlDir, file), "utf8");
    await client.unsafe(statement);
    await client.unsafe(`INSERT INTO _custom_sql_migrations (filename) VALUES ($1)`, [file]);
  }

  await client.end();
}

main()
  .then(() => {
    console.warn("Migrációk lefutottak.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
