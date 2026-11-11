import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Fresh SQLite database for integration tests, built from the real migrations. */
export default function setup() {
  for (const f of ["test.db", "test.db-journal"]) rmSync(f, { force: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: "file:./test.db" }, stdio: "ignore" });
  return () => rmSync("test.db", { force: true });
}
