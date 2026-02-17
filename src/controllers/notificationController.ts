import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Notification } from '../models/Notification.js';
import { socketService } from '../services/socketService.js';

// @desc    Get notifications for logged in user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    // Assuming req.user has role. We need to cast or access it safely.
    // In authMiddleware or authController, we populate these.
    // Let's assume req.user is populated with IStaff interface logic
    const userRole = (req.user as any).role;

    if (!userId) {
        res.status(401);
        throw new Error('Not authorized');
    }

    // Find notifications that are either for this specific user OR for their role
    const notifications = await Notification.find({
        $or: [
            { recipient: userId },
            { role: userRole },
            { role: 'Admin' } // Admin sees everything? Or should we duplicate triggers?
            // Actually, usually we want explicit notifications.
            // But if we broadcast to "Admin", the user with role "Admin" should see it.
        ]
    }).sort({ createdAt: -1 }).limit(50);

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

// Helper function to create notification internally
export const createNotification = async (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error',
    role?: string,
    recipientId?: string,
    referenceId?: string,
    link?: string
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

    // Emit socket event
    if (role) {
        socketService.emit('notification', notification, `role:${role}`);
    } else if (recipientId) {
        // We'd need to map userId to socketId or have a room for userId
        // For now, let's assume we might have a room for `user:${userId}`
        socketService.emit('notification', notification, `user:${recipientId}`);
    }

    return notification;
};
