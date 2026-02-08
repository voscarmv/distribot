import { DynamicStoreBackend } from '@voscarmv/apigen';
import { registeredUsers, telegramUserInvitations } from './schema.js';
import { Bot } from "grammy";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import 'dotenv/config';

if (!process.env.TG_KEY) { throw new Error("TG_KEY undefined"); }
const bot = new Bot(process.env.TG_KEY);

// Create backend instance
export const BackendDB = new DynamicStoreBackend({
    dbUrl: process.env.DATABASE_URL!,
    port: 3000
});

// Leverage the db getter from apigen as requested
const db = BackendDB.db;

// Telegram Bot Logic
bot.command("start", async (ctx) => {
    await ctx.reply("🚀 Welcome! If you have an invitation key, please send it to register.\n\nAdmin users can use /invite to generate new keys.");
});

bot.command("invite", async (ctx) => {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    const userResults = await db.select().from(registeredUsers).where(eq(registeredUsers.telegramId, telegramId)).limit(1);
    const adminUser = userResults[0];

    if (!adminUser || adminUser.privilege !== 'admin') {
        await ctx.reply("❌ You are not authorized to generate invitations.");
        return;
    }

    // Get group tag from command arguments (e.g., /invite developers)
    const groupTag = ctx.match?.trim() || "general";

    const invitationKey = crypto.randomBytes(16).toString("hex");
    await db.insert(telegramUserInvitations).values({
        invitationKey,
        privilege: 'regular',
        groupTag: groupTag,
    });

    await ctx.reply(`🎫 *New Invitation Key Generated*:\n\nGroup: \`${groupTag}\`\nKey: \`${invitationKey}\`\n\nValid for 24 hours.`, { parse_mode: "MarkdownV2" });
});

bot.command("broadcast", async (ctx) => {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    // Check if user is admin
    const adminQuery = await db.select().from(registeredUsers).where(eq(registeredUsers.telegramId, telegramId)).limit(1);
    const admin = adminQuery[0];

    if (!admin || admin.privilege !== 'admin') {
        await ctx.reply("❌ You are not authorized to broadcast messages.");
        return;
    }

    const args = ctx.match?.trim().split(/\s+/);
    if (!args || args.length < 2) {
        await ctx.reply("❌ Usage: /broadcast <tag> <message>");
        return;
    }

    const tag = args[0] as string;
    const message = args.slice(1).join(" ");

    // Find all users in the specific group
    const targets = await db.select().from(registeredUsers).where(eq(registeredUsers.groupTag, tag));

    if (targets.length === 0) {
        await ctx.reply(`⚠️ No users found in group: ${tag}`);
        return;
    }

    let successCount = 0;
    for (const target of targets) {
        try {
            await bot.api.sendMessage(target.telegramId, `📢 *Broadcast for ${tag}*:\n\n${message}`, { parse_mode: "Markdown" });
            successCount++;
        } catch (e) {
            console.error(`Failed to send message to ${target.telegramId}:`, e);
        }
    }

    await ctx.reply(`✅ Broadcast sent to ${successCount}/${targets.length} users in group: ${tag}`);
});

bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return; // Ignore commands
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    // Check if user is already registered
    const existingUser = await db.select().from(registeredUsers).where(eq(registeredUsers.telegramId, telegramId)).limit(1);
    if (existingUser.length) {
        await ctx.reply("✅ You are already registered.");
        return;
    }

    const key = ctx.message.text.trim();

    // Validate invitation key (must match and not be expired)
    const invitation = await db.select().from(telegramUserInvitations)
        .where(and(
            eq(telegramUserInvitations.invitationKey, key),
            gt(telegramUserInvitations.expiresAt, new Date())
        ))
        .limit(1);

    if (invitation.length > 0 && ctx.from) {
        const invite = invitation[0]!;
        // Register user in the database
        await db.insert(registeredUsers).values({
            telegramId,
            username: ctx.from.username || ctx.from.first_name,
            privilege: invite.privilege,
            groupTag: invite.groupTag,
        });

        // Delete the invitation key after successful registration
        await db.delete(telegramUserInvitations).where(eq(telegramUserInvitations.invitationKey, key));

        await ctx.reply(`🎉 Success! You have been registered as a **${invite.privilege}** user in the **${invite.groupTag}** group.`);
    } else {
        await ctx.reply("❌ Invalid or expired invitation key.");
    }
});

// Start the bot
bot.start();

// API Routes
BackendDB.route({
    method: 'get',
    path: '/users',
    handler: async (db, req, res) => {
        const allUsers = await db.select().from(registeredUsers);
        res.json(allUsers);
    }
});

BackendDB.route({
    method: 'get',
    path: '/invitations',
    handler: async (db, req, res) => {
        const allInvites = await db.select().from(telegramUserInvitations);
        res.json(allInvites);
    }
});

