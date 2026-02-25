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
