import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db, attendeesTable } from "@workspace/db";
import { GenerateInvitationsBody } from "@workspace/api-zod";
import { requireOrganizer } from "./event-helpers.js";

const router: IRouter = Router();
router.use("/invitations", requireOrganizer);

router.post("/invitations/generate", async (req, res): Promise<void> => {
  const parsed = GenerateInvitationsBody.safeParse(req.body);
  if (
    !parsed.success ||
    !Number.isInteger(parsed.data?.vipCount) ||
    !Number.isInteger(parsed.data?.regularCount) ||
    (parsed.data?.vipCount ?? 0) < 0 ||
    (parsed.data?.regularCount ?? 0) < 0 ||
    (parsed.data?.vipCount ?? 0) + (parsed.data?.regularCount ?? 0) === 0
  ) {
    res.status(400).json({ error: "Request at least one VIP or Regular invitation." });
    return;
  }

  const { vipCount, regularCount } = parsed.data;
  const requested = [
    ...Array.from({ length: vipCount }, () => "vip" as const),
    ...Array.from({ length: regularCount }, () => "regular" as const),
  ];
  const records = requested.map((type) => ({
    qrId: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
    name: `${type === "vip" ? "VIP" : "Regular"} Invitation`,
    ticketType: type === "vip" ? "VIP" : "Regular",
  }));

  const inserted = await db.insert(attendeesTable).values(records).returning();

  res.status(200).json(inserted);
});

export default router;