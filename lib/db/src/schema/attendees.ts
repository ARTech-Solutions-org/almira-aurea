import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendeesTable = pgTable(
  "attendees",
  {
    id: serial("id").primaryKey(),
    qrId: text("qr_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    ticketType: text("ticket_type").notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    qrIdIndex: uniqueIndex("attendees_qr_id_unique").on(table.qrId),
  }),
);

export const insertAttendeeSchema = createInsertSchema(attendeesTable).omit({
  id: true,
  createdAt: true,
  checkedInAt: true,
});
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendeesTable.$inferSelect;