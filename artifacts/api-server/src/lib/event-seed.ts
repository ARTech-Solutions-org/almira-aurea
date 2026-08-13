import { db, attendeesTable, organizerUsersTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { hashPassword } from "./event-auth";

let seedPromise: Promise<void> | null = null;

export function ensureEventSeed(): Promise<void> {
  seedPromise ??= (async () => {
    const [{ total }] = await db.select({ total: count() }).from(organizerUsersTable);
    if (Number(total) === 0) {
      await db.insert(organizerUsersTable).values({
        username: "organizer",
        displayName: "Event Organizer",
        passwordHash: await hashPassword(process.env.ORGANIZER_PASSWORD ?? "welcome123"),
      });
    }

    const [{ total: attendeeTotal }] = await db.select({ total: count() }).from(attendeesTable);
    if (Number(attendeeTotal) === 0) {
      await db.insert(attendeesTable).values([
        { qrId: "EVT-7Q4M-001", name: "Jordan Lee", email: "jordan@example.com", ticketType: "General admission" },
        { qrId: "EVT-7Q4M-002", name: "Maya Patel", email: "maya@example.com", ticketType: "VIP" },
        { qrId: "EVT-7Q4M-003", name: "Theo Martin", email: "theo@example.com", ticketType: "General admission" },
      ]);
    }
  })();
  return seedPromise;
}