import webpush from 'web-push';
import { PushSubscriptionModel } from '../models/PushSubscription.js';

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;        // Collapses duplicate notifications (e.g. same request updated twice)
    url?: string;        // Clicked notification opens this URL
    data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Lazy VAPID initialisation
// Called on first push attempt, not at module load, so a missing key
// never crashes the entire Express server.
// ---------------------------------------------------------------------------
let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@smanahotels.com';

    if (!publicKey || !privateKey) {
        console.warn('[Push] VAPID keys not configured — push notifications are disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env to enable them.');
        return false;
    }

    try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        vapidConfigured = true;
        console.log('[Push] VAPID keys loaded ✓');
        return true;
    } catch (err) {
        console.error('[Push] Invalid VAPID keys:', err);
        return false;
    }
}

/**
 * Send a push notification to ALL subscribers with a given role.
 * Used for role-based events (e.g. Chef receives food order pushes).
 */
export async function sendPushToRole(role: string, payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return;
    const subscriptions = await PushSubscriptionModel.find({ role });
    await sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Send a push to all roles in the list — used for Admin/Manager who receive everything.
 */
export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return;
    const subscriptions = await PushSubscriptionModel.find({ role: { $in: roles } });
    await sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Send a push notification to a SPECIFIC user by their userId.
 * Used when a guest receives a status update notification (e.g. order ready).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return;
    const subscriptions = await PushSubscriptionModel.find({ userId });
    await sendPushToSubscriptions(subscriptions, payload);
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------
async function sendPushToSubscriptions(
    subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string }; _id: any }>,
    payload: PushPayload
): Promise<void> {
    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-96.png',
        tag: payload.tag,
        data: {
            url: payload.url || '/dashboard',
            ...(payload.data || {}),
        },
    });

    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
                    },
                    pushPayload
                );
            } catch (err: any) {
                // 410 Gone = subscription expired/removed — clean it up automatically
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Push] Removing expired subscription: ${sub.endpoint}`);
                    await PushSubscriptionModel.findByIdAndDelete(sub._id);
                } else {
                    console.error(`[Push] Failed to send to ${sub.endpoint}:`, err.message);
                }
            }
        })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications`);
}
