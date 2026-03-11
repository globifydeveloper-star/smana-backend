/**
 * scripts/send_test_push.ts
 *
 * CLI helper to send FCM test notifications without the app.
 *
 * Usage:
 *   npx ts-node --esm scripts/send_test_push.ts \
 *     --mode=user --userId=<mongoId> \
 *     --title="Hello" --body="Test push"
 *
 *   npx ts-node --esm scripts/send_test_push.ts \
 *     --mode=role --role=Admin \
 *     --title="Admin alert" --body="Something happened"
 *
 *   npx ts-node --esm scripts/send_test_push.ts \
 *     --mode=data --userId=<mongoId>
 *     (sends a data-only message — no OS notification banner, just data payload)
 *
 * Prerequisites:
 *   - Copy .env.example to .env and fill in Firebase credentials
 *   - npm install (firebase-admin is already a dependency)
 *
 * The script reuses the production pushService so the exact same
 * chunking and stale-token-cleanup logic runs as in production.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { sendPushToUser, sendPushToRole } from '../src/services/pushService.js';
import { getAdminMessaging } from '../src/config/firebaseAdmin.js';
import { FcmTokenModel } from '../src/models/FcmToken.js';

// ── Parse CLI args ──────────────────────────────────────────────────────────
function arg(name: string): string | undefined {
    const found = process.argv.find((a) => a.startsWith(`--${name}=`));
    return found?.split('=').slice(1).join('=');
}

const mode = arg('mode') ?? 'user';   // 'user' | 'role' | 'data'
const userId = arg('userId') ?? '';
const role = arg('role') ?? 'Admin';
const title = arg('title') ?? '🔔 Smana Test Push';
const body = arg('body') ?? 'This is a test notification from the CLI script.';

async function main() {
    const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/smana_hotel';
    await mongoose.connect(mongoUri);
    console.log('[TestPush] Connected to MongoDB');

    const messaging = getAdminMessaging();
    if (!messaging) {
        console.error('[TestPush] Firebase Admin NOT initialised — check your .env credentials');
        process.exit(1);
    }

    if (mode === 'user') {
        if (!userId) {
            console.error('[TestPush] --userId is required for mode=user');
            process.exit(1);
        }
        console.log(`[TestPush] Sending notification push to userId=${userId}`);
        await sendPushToUser(userId, { title, body, url: '/dashboard' });
    } else if (mode === 'role') {
        console.log(`[TestPush] Sending notification push to role=${role}`);
        await sendPushToRole(role, { title, body, url: '/dashboard' });
    } else if (mode === 'data') {
        // Data-only message — no OS notification banner; Flutter code handles it
        if (!userId) {
            console.error('[TestPush] --userId is required for mode=data');
            process.exit(1);
        }
        const docs = await FcmTokenModel.find({ userId }).select('token _id');
        if (docs.length === 0) {
            console.warn('[TestPush] No FCM tokens found for this user');
        } else {
            const result = await messaging.sendEachForMulticast({
                tokens: docs.map((d) => d.token),
                // DATA-ONLY: no `notification` key — FCM will NOT show an OS banner.
                // The app's background handler receives this via `data` map.
                data: {
                    type: 'data_only_test',
                    payload: JSON.stringify({ message: 'silent update', timestamp: Date.now().toString() }),
                },
                android: { priority: 'high' },
            });
            console.log(`[TestPush] Data-only message delivered: ${result.successCount}/${docs.length}`);
        }
    } else {
        console.error(`[TestPush] Unknown mode "${mode}". Use: user | role | data`);
        process.exit(1);
    }

    await mongoose.disconnect();
    console.log('[TestPush] Done ✅');
}

main().catch((err) => {
    console.error('[TestPush] Fatal error:', err);
    process.exit(1);
});
