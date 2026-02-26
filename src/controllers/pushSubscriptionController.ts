import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FcmTokenModel } from '../models/FcmToken.js';
import { getAdminMessaging } from '../config/firebaseAdmin.js';

// @desc    Save (or refresh) an FCM token for the logged-in user
// @route   POST /api/push/subscribe
// @access  Private
export const subscribeToPush = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user?._id) {
        res.status(401);
        throw new Error('Not authorised');
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        res.status(400);
        throw new Error('FCM token is required');
    }

    // Upsert: if this device token already exists, update its userId/role
    await FcmTokenModel.findOneAndUpdate(
        { token },
        {
            userId: user._id,
            role: user.role || 'Admin',
            token,
            userAgent: req.headers['user-agent'] || '',
        },
        { upsert: true, new: true }
    );

    res.status(201).json({ message: 'FCM token registered for push notifications' });
});

// @desc    Remove an FCM token (called on logout / notification permission revoked)
// @route   DELETE /api/push/unsubscribe
// @access  Private
export const unsubscribeFromPush = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) {
        res.status(400);
        throw new Error('FCM token is required');
    }

    await FcmTokenModel.findOneAndDelete({ token });
    res.json({ message: 'FCM token removed' });
});

// @desc    Get all FCM tokens for the logged-in user (debug use)
// @route   GET /api/push/subscriptions
// @access  Private/Admin
export const getMySubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const tokens = await FcmTokenModel.find({ userId: user._id })
        .select('-token') // Don't expose full token string
        .sort({ createdAt: -1 });
    res.json(tokens);
});

// @desc    Count all FCM tokens in the DB — quick health check
// @route   GET /api/push/count
// @access  Private/Admin
export const countSubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const total = await FcmTokenModel.countDocuments();
    const byRole = await FcmTokenModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const fcmConfigured = !!getAdminMessaging();
    res.json({
        total,
        byRole,
        fcmConfigured,
        message: fcmConfigured
            ? '✅ Firebase Admin is initialised — FCM push is ready'
            : '❌ Firebase Admin NOT initialised — check GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env vars'
    });
});

// @desc    Send a test FCM push to yourself — verifies the full push chain
// @route   POST /api/push/test
// @access  Private
export const sendTestPush = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { sendPushToUser } = await import('../services/pushService.js');

    await sendPushToUser(user._id.toString(), {
        title: '✅ FCM Push Test',
        body: `Hello ${user.name || user.email}! Firebase push notifications are working.`,
        icon: '/icon-192.png',
        url: '/dashboard',
        tag: 'push-test',
    });

    const tokenCount = await FcmTokenModel.countDocuments({ userId: user._id });
    res.json({
        message: `Test push sent to ${tokenCount} FCM token(s) for your account`,
        tokenCount,
        tip: tokenCount === 0
            ? 'No FCM tokens found. Log out, log back in, and allow notifications in the browser.'
            : 'Check your browser/OS for the test notification.',
    });
});
