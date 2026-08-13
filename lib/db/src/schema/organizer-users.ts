import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizerUsersTable = pgTable("organizer_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrganizerUserSchema = createInsertSchema(organizerUsersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganizerUser = z.infer<typeof insertOrganizerUserSchema>;
export type OrganizerUser = typeof organizerUsersTable.$inferSelect;