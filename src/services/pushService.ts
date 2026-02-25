import webpush from 'web-push';
import { PushSubscriptionModel } from '../models/PushSubscription.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure VAPID details once at module load
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@smanahotels.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;        // Collapses duplicate notifications (e.g. same request updated twice)
    url?: string;        // Clicked notification opens this URL
    data?: Record<string, unknown>;
}

/**
 * Send a push notification to ALL subscribers with a given role.
 * Used for role-based events (e.g. Chef receives food order pushes).
 */
export async function sendPushToRole(role: string, payload: PushPayload): Promise<void> {
    const subscriptions = await PushSubscriptionModel.find({ role });
    await sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Send a push to all roles in the list — used for Admin/Manager who receive everything.
 */
export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<void> {
    const subscriptions = await PushSubscriptionModel.find({ role: { $in: roles } });
    await sendPushToSubscriptions(subscriptions, payload);
}

/**
 * Send a push notification to a SPECIFIC user by their userId.
 * Used when a guest receives a status update notification.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
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
                // 410 Gone = subscription expired/removed — clean it up
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
    if (subscriptions.length > 0) {
        console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications`);
    }
}
