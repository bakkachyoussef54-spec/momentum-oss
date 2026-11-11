import { db } from "@/lib/db";

/** Empties the throwaway integration-test database. Refuses to run against any other database. */
export async function resetTestDb() {
  if (process.env.DATABASE_URL !== "file:./test.db") throw new Error("resetTestDb only runs against file:./test.db");
  await db.brand.deleteMany();
  await db.template.deleteMany();
  await db.activityLog.deleteMany();
  await db.appSetting.deleteMany();
  await db.copywritingAnalysis.deleteMany();
}
