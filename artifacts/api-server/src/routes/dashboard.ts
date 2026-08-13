import { Router, type IRouter } from "express";
import { count, desc, isNotNull, sql } from "drizzle-orm";
import { db, attendeesTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireOrganizer } from "./event-helpers.js";

const router: IRouter = Router();
router.use("/dashboard", requireOrganizer);

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [{ total }] = await db.select({ total: count() }).from(attendeesTable);
  const [{ checkedIn }] = await db
    .select({ checkedIn: count() })
    .from(attendeesTable)
    .where(isNotNull(attendeesTable.checkedInAt));
  const recent = await db
    .select({
      name: attendeesTable.name,
      ticketType: attendeesTable.ticketType,
      checkedInAt: attendeesTable.checkedInAt,
    })
    .from(attendeesTable)
    .where(isNotNull(attendeesTable.checkedInAt))
    .orderBy(desc(attendeesTable.checkedInAt))
    .limit(5);
  res.json(
    GetDashboardSummaryResponse.parse({
      total: Number(total),
      checkedIn: Number(checkedIn),
      remaining: Number(total) - Number(checkedIn),
      recentCheckIns: recent,
    }),
  );
});

export default router;