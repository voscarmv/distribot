import { registeredUsers } from './schema.js';
import { BackendDB } from './server.js';
import 'dotenv/config';

async function main() {
    // Get the database instance from BackendDB
    const db = BackendDB.db;

    // Check if telegram ID is provided
    const telegramId = process.argv[2] ? parseInt(process.argv[2]) : null;

    if (!telegramId) {
        console.log("Usage: node --loader ts-node/esm src/seed.ts <YOUR_TELEGRAM_ID>");
        console.log("You can get your ID by messaging @userinfobot on Telegram.");
        process.exit(1);
    }

    console.log(`Seeding admin user with ID: ${telegramId}...`);

    try {
        await db.insert(registeredUsers).values({
            telegramId: telegramId,
            username: 'admin',
            privilege: 'admin',
        }).onConflictDoNothing();

        // Schedule cleanup of expired invitations (requires pg_cron)
        try {
            const { sql } = await import('drizzle-orm');
            await db.execute(sql`
                SELECT cron.schedule(
                    'cleanup-expired-invites',
                    '0 * * * *',
                    $$DELETE FROM telegram_user_invitations WHERE expires_at < NOW()$$
                )
            `);
            console.log('✅ Cleanup task scheduled (requires pg_cron).');
        } catch (e) {
            console.log('⚠️ Could not schedule pg_cron task. Ensure pg_cron is installed if you want automatic cleanup.');
        }

        console.log('✅ Admin user registered successfully!');
    } catch (error) {
        console.error('❌ Failed to seed admin user:', error);
    } finally {
        // The process might hang due to open DB connections if not handled by apigen
        process.exit(0);
    }
}

main().catch(console.error);
