import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, attendeesTable } from "@workspace/db";
import { CheckInBody, CheckInResponse } from "@workspace/api-zod";
import { requireOrganizer } from "./event-helpers.js";

const router: IRouter = Router();
router.use("/check-ins", requireOrganizer);

router.post("/check-ins", async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Scan a valid QR code." });
    return;
  }
  const qrId = parsed.data.qrId.trim();
  const now = new Date();
  const [updated] = await db
    .update(attendeesTable)
    .set({ checkedInAt: now })
    .where(and(eq(attendeesTable.qrId, qrId), isNull(attendeesTable.checkedInAt)))
    .returning();
  if (updated) {
    res.json(CheckInResponse.parse({ status: "valid", message: `${updated.name} is checked in.`, attendee: updated }));
    return;
  }
  const [attendee] = await db.select().from(attendeesTable).where(eq(attendeesTable.qrId, qrId)).limit(1);
  if (!attendee) {
    res.json(CheckInResponse.parse({ status: "invalid", message: "This QR code is not registered for this event.", attendee: null }));
    return;
  }
  res.json(CheckInResponse.parse({ status: "duplicate", message: `${attendee.name} has already checked in.`, attendee }));
});

export default router;