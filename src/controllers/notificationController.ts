import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Notification } from '../models/Notification.js';
import { socketService } from '../services/socketService.js';
import { sendPushToRole, sendPushToUser, type PushPayload } from '../services/pushService.js';

// @desc    Get notifications for logged in user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const userRole = (req.user as any).role;

    if (!userId) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Admin and Manager can see ALL notifications globally
    const query = ['Admin', 'Manager'].includes(userRole)
        ? {}
        : {
            $or: [
                { recipient: userId },
                { role: userRole },
            ]
        };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);

    res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark ALL notifications as read for the logged-in user
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const userRole = (req.user as any).role;

    await Notification.updateMany(
        {
            $or: [{ recipient: userId }, { role: userRole }],
            isRead: false,
        },
        { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
});

// ---------------------------------------------------------------------------
// Helper: createNotification
// Creates a DB notification, emits via socket, AND sends a Web Push.
//
// Role-based push routing mirrors the current socket room logic:
//   - If `role` is provided  → push to all subscribers of that role
//   - If `recipientId`       → push to that specific user (guest status updates etc.)
//   - Admin/Manager always receive ALL role-based pushes (done in each controller
//     by calling createNotification twice — once for the specific role, once for Admin)
// ---------------------------------------------------------------------------
export const createNotification = async (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error',
    role?: string | string[],
    recipientId?: string,
    referenceId?: string,
    link?: string,
    pushPayload?: Partial<PushPayload>   // Optional override for push content
) => {
    const notification = await Notification.create({
        title,
        message,
        type,
        role,
        recipient: recipientId,
        referenceId,
        link
    });

    // ── Socket emit ────────────────────────────────────────────────────────
    // 1. Always broadcast to Admin and Manager globally
    socketService.emit('notification', notification, `role:Admin`);
    socketService.emit('notification', notification, `role:Manager`);

    // 2. Broadcast to the specific target role(s) or recipient
    if (role) {
        const rolesToEmit = Array.isArray(role) ? role : [role];
        for (const r of rolesToEmit) {
            if (r !== 'Admin' && r !== 'Manager') {
                socketService.emit('notification', notification, `role:${r}`);
            }
        }
    }
    if (recipientId) {
        socketService.emit('notification', notification, `user:${recipientId}`);
    }

    // ── Web Push ──────────────────────────────────────────────────────────
    // Push payload falls back to the notification title/message if not overridden
    const push: PushPayload = {
        title: pushPayload?.title ?? title,
        body: pushPayload?.body ?? message,
        icon: pushPayload?.icon ?? '/icon-192.png',
        badge: '/icon-96.png',
        tag: pushPayload?.tag ?? referenceId,
        url: pushPayload?.url ?? link ?? '/dashboard',
        data: pushPayload?.data,
    };

    try {
        if (role) {
            const rolesToPush = Array.isArray(role) ? role : [role];
            for (const r of rolesToPush) {
                await sendPushToRole(r, push);
            }
        } else if (recipientId) {
            await sendPushToUser(recipientId, push);
        }
    } catch (err) {
        // Push failures must never crash the main request flow
        console.error('[Push] Failed to send push notification:', err);
    }

    return notification;
};
