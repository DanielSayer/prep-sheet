import { db } from "@prep-sheet/db";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";

it("runs integration workers against the isolated PostgreSQL database", async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  expect(process.env.PREP_SHEET_TEST_DATABASE).toBe("isolated");
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.port).not.toBe("5432");
  expect(url.pathname).toBe("/prep_sheet_test");

  const result = await db.execute(
    sql`select current_database() as database_name`,
  );
  expect(result.rows[0]).toMatchObject({ database_name: "prep_sheet_test" });
});
