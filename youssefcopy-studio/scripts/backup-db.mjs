// Safe online backup of the local SQLite database (works while the app is running).
// Usage: npm run db:backup   — writes backups/<name>-YYYYMMDD-HHMMSS.db and never modifies the source.
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

function databasePath() {
  let url = process.env.DATABASE_URL;
  if (!url && existsSync(".env")) {
    const m = readFileSync(".env", "utf8").match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    url = m?.[1];
  }
  url = url ?? "file:./dev.db";
  return resolve(url.replace(/^file:/, ""));
}

const src = databasePath();
if (!existsSync(src)) {
  console.log(`No database found at ${src} — nothing to back up.`);
  process.exit(0);
}
mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const dest = resolve("backups", `${basename(src, ".db")}-${stamp}.db`);
const db = new Database(src, { readonly: true, fileMustExist: true });
await db.backup(dest);
db.close();
console.log(`Backed up ${src} → ${dest}`);
