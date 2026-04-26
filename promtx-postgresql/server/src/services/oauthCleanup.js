import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
/**
 * Cleans OAuthState records that are older than 5 minutes.
 */
export async function cleanExpiredOAuthStates() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
        const deleted = await prisma.oAuthState.deleteMany({
            where: {
                createdAt: {
                    lt: fiveMinutesAgo,
                },
            },
        });
        if (deleted.count > 0) {
            console.log(`[OAuth Cleanup] ${new Date().toISOString()} - Cleaned ${deleted.count} expired OAuth states.`);
        }
    }
    catch (error) {
        console.error('[OAuth Cleanup] Error cleaning expired OAuth states:', error);
    }
}
// Run immediately if executed directly by Bun
if (import.meta.main) {
    console.log('[OAuth Cleanup] Running one-time cleanup...');
    await cleanExpiredOAuthStates();
    console.log('[OAuth Cleanup] One-time cleanup finished.');
    process.exit(0);
}
// Schedule execution every 5 minutes if imported
export function startOAuthCleanupTask() {
    console.log('[OAuth Cleanup] Scheduled OAuth cleanup task started (runs every 5 minutes).');
    setInterval(cleanExpiredOAuthStates, 5 * 60 * 1000);
}
