import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, isNull, isNotNull, or } from "drizzle-orm";
import { db, attendeesTable } from "@workspace/db";
import {
  CreateAttendeeBody,
  CreateAttendeeResponse,
  ImportAttendeesBody,
  ImportAttendeesResponse,
  ListAttendeesQueryParams,
  ListAttendeesResponse,
} from "@workspace/api-zod";
import { requireOrganizer } from "./event-helpers.js";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();
router.use("/attendees", requireOrganizer);

router.get("/attendees", async (req, res): Promise<void> => {
  const parsed = ListAttendeesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q, status = "all" } = parsed.data;
  const filters = [];
  if (q) {
    filters.push(or(ilike(attendeesTable.name, `%${q}%`), ilike(attendeesTable.email, `%${q}%`), ilike(attendeesTable.qrId, `%${q}%`)));
  }
  if (status === "checked-in") filters.push(isNotNull(attendeesTable.checkedInAt));
  if (status === "pending") filters.push(isNull(attendeesTable.checkedInAt));
  const attendees = await db
    .select()
    .from(attendeesTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(attendeesTable.name));
  res.json(ListAttendeesResponse.parse(attendees));
});

router.post("/attendees/create", async (req, res): Promise<void> => {
  const parsed = CreateAttendeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const attendeeData = {
    qrId: parsed.data.qrId?.trim() || `EVT-${randomUUID().slice(0, 8).toUpperCase()}`,
    name: parsed.data.name.trim(),
    email: parsed.data.email?.trim() || null,
    ticketType: parsed.data.ticketType.trim(),
  };

  const [inserted] = await db.insert(attendeesTable).values(attendeeData).returning();
  res.status(201).json(CreateAttendeeResponse.parse(inserted));
});

router.post("/attendees/import", async (req, res): Promise<void> => {
  const parsed = ImportAttendeesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Each attendee needs a name and ticket type." });
    return;
  }
  const values = parsed.data.attendees.map((attendee) => ({
    qrId: attendee.qrId?.trim() || `EVT-${randomUUID().slice(0, 8).toUpperCase()}`,
    name: attendee.name.trim(),
    email: attendee.email?.trim() || null,
    ticketType: attendee.ticketType.trim(),
  }));
  const existing = new Set(
    (await db.select({ qrId: attendeesTable.qrId }).from(attendeesTable)).map((row) => row.qrId),
  );
  const fresh = values.filter((value) => !existing.has(value.qrId));
  const skipped = values.length - fresh.length;
  const inserted = fresh.length ? await db.insert(attendeesTable).values(fresh).returning() : [];
  res.status(201).json(ImportAttendeesResponse.parse({ imported: inserted.length, skipped, attendees: inserted }));
});

export default router;