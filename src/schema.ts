import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const registeredUsers = pgTable("registered_users", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  username: text("username"),
  privilege: text("privilege").notNull().default("regular"), // 'admin' or 'regular'
  groupTag: text("group_tag").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const telegramUserInvitations = pgTable("telegram_user_invitations", {
  invitationKey: text("invitation_key").primaryKey(),
  privilege: text("privilege").notNull().default("regular"), // 'admin' or 'regular'
  groupTag: text("group_tag").notNull().default("general"),
  expiresAt: timestamp("expires_at").default(sql`NOW() + INTERVAL '24 hours'`).notNull(),
});