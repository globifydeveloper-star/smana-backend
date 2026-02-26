import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { PushSubscriptionModel } from '../models/PushSubscription.js';

// @desc    Get the VAPID public key (needed by the browser to create a subscription)
// @route   GET /api/push/vapid-public-key
// @access  Private
export const getVapidPublicKey = asyncHandler(async (req: Request, res: Response) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        res.status(500);
        throw new Error('VAPID public key not configured on the server');
    }
    res.json({ publicKey: key });
});

// @desc    Save a push subscription for the logged-in user
// @route   POST /api/push/subscribe
// @access  Private
export const subscribeToPush = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user?._id) {
        res.status(401);
        throw new Error('Not authorised');
    }

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400);
        throw new Error('Invalid subscription object — endpoint and keys required');
    }

    // Upsert: if this browser already has a subscription, update it
    await PushSubscriptionModel.findOneAndUpdate(
        { endpoint },
        {
            userId: user._id,
            role: user.role || 'Admin',
            endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
            userAgent: req.headers['user-agent'] || '',
        },
        { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Subscribed to push notifications' });
});

// @desc    Remove a push subscription
// @route   DELETE /api/push/unsubscribe
// @access  Private
export const unsubscribeFromPush = asyncHandler(async (req: Request, res: Response) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        res.status(400);
        throw new Error('endpoint is required');
    }

    await PushSubscriptionModel.findOneAndDelete({ endpoint });
    res.json({ message: 'Unsubscribed from push notifications' });
});

// @desc    Get all subscriptions for the logged-in user (debug/admin use)
// @route   GET /api/push/subscriptions
// @access  Private/Admin
export const getMySubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const subs = await PushSubscriptionModel.find({ userId: user._id })
        .select('-keys') // Don't expose keys
        .sort({ createdAt: -1 });
    res.json(subs);
});

// @desc    Count all subscriptions in the DB — quick health check
// @route   GET /api/push/count
// @access  Private/Admin
export const countSubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const total = await PushSubscriptionModel.countDocuments();
    const byRole = await PushSubscriptionModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    res.json({
        total,
        byRole,
        vapidConfigured,
        message: vapidConfigured
            ? '✅ VAPID keys are set on this server'
            : '❌ VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are NOT set — push will not work!'
    });
});

// @desc    Send a test push to yourself — verifies the full push chain
// @route   POST /api/push/test
// @access  Private
export const sendTestPush = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { sendPushToUser } = await import('../services/pushService.js');

    await sendPushToUser(user._id.toString(), {
        title: '✅ Push Test',
        body: `Hello ${user.name || user.email}! Push notifications are working correctly.`,
        icon: '/icon-192.png',
        url: '/dashboard',
        tag: 'push-test',
    });

    const subCount = await PushSubscriptionModel.countDocuments({ userId: user._id });
    res.json({
        message: `Test push sent to ${subCount} subscription(s) for your account`,
        subscriptionCount: subCount,
        tip: subCount === 0
            ? 'No subscriptions found for your account. Log out, log back in, and allow notifications.'
            : 'Check your browser/OS for the test notification.',
    });
});
