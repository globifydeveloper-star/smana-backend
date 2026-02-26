/**
 * src/services/pushService.ts
 *
 * Sends Firebase Cloud Messaging (FCM) push notifications to admin/staff users.
 *
 * Migration note: replaces the previous web-push / VAPID implementation.
 * The `web-push` package is still installed but no longer used here.
 *
 * Fan-out strategy (unchanged from before):
 *  - Admin and Manager ("super roles") always receive every notification.
 *  - Role-specific sends also fan out to Admin+Manager so they see everything.
 */

import { getAdminMessaging } from '../config/firebaseAdmin.js';
import { FcmTokenModel } from '../models/FcmToken.js';
import type { MulticastMessage } from 'firebase-admin/messaging';

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: Record<string, unknown>;
}

// Admin and Manager always receive every notification (mirrors socket-room logic)
const SUPER_ROLES = ['Admin', 'Manager'];

// ---------------------------------------------------------------------------
// Public API — same function signatures as before for zero-disruption
// ---------------------------------------------------------------------------

/** Send to a specific role + always fan out to Admin + Manager */
export async function sendPushToRole(role: string, payload: PushPayload): Promise<void> {
    const targetRoles = [...new Set([role, ...SUPER_ROLES])];
    const docs = await FcmTokenModel.find({ role: { $in: targetRoles } }).select('token _id');
    await _sendToTokens(docs, payload);
}

/** Send to a list of roles + always fan out to Admin + Manager */
export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<void> {
    const targetRoles = [...new Set([...roles, ...SUPER_ROLES])];
    const docs = await FcmTokenModel.find({ role: { $in: targetRoles } }).select('token _id');
    await _sendToTokens(docs, payload);
}

/** Send to a specific user (e.g. guest gets a status update) */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    const docs = await FcmTokenModel.find({ userId }).select('token _id');
    await _sendToTokens(docs, payload);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function _sendToTokens(
    docs: Array<{ token: string; _id: any }>,
    payload: PushPayload
): Promise<void> {
    const messaging = getAdminMessaging();
    if (!messaging) {
        console.warn('[FCM] Firebase Admin not initialised — push notifications are DISABLED');
        return;
    }

    if (docs.length === 0) {
        console.log('[FCM] No FCM tokens found — skipping push');
        return;
    }

    const tokens = docs.map((d) => d.token);

    // FCM multicast message (up to 500 tokens per call)
    // We chunk in case there are more than 500 tokens
    const CHUNK_SIZE = 500;
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);
        const chunkDocs = docs.slice(i, i + CHUNK_SIZE);

        const message: MulticastMessage = {
            tokens: chunk,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.icon,
            },
            webpush: {
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon || '/icon-192.png',
                    badge: payload.badge || '/icon-96.png',
                    tag: payload.tag,
                    renotify: !!payload.tag,
                    vibrate: [200, 100, 200],
                    data: {
                        url: payload.url || '/dashboard',
                        ...(payload.data ? _stringifyValues(payload.data) : {}),
                    },
                },
                fcmOptions: {
                    link: payload.url || '/dashboard',
                },
            },
        };

        try {
            const result = await messaging.sendEachForMulticast(message);
            console.log(`[FCM] Delivered ${result.successCount}/${chunk.length} notifications for "${payload.title}"`);

            // Clean up tokens that are no longer valid
            const expiredIds: any[] = [];
            result.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    if (
                        errCode === 'messaging/registration-token-not-registered' ||
                        errCode === 'messaging/invalid-registration-token' ||
                        errCode === 'messaging/invalid-argument'
                    ) {
                        console.log(`[FCM] Removing invalid/expired token: ${chunk[idx].slice(0, 30)}…`);
                        expiredIds.push(chunkDocs[idx]._id);
                    } else {
                        console.error(`[FCM] Failed to send to token ${idx}:`, resp.error?.message);
                    }
                }
            });

            if (expiredIds.length > 0) {
                await FcmTokenModel.deleteMany({ _id: { $in: expiredIds } });
            }
        } catch (err: any) {
            console.error('[FCM] sendEachForMulticast error:', err?.message || err);
        }
    }
}

/** FCM webpush data values must all be strings */
function _stringifyValues(data: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(data)) {
        result[key] = typeof val === 'string' ? val : JSON.stringify(val);
    }
    return result;
}
