import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    getVapidPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
    getMySubscriptions,
    countSubscriptions,
    sendTestPush,
} from '../controllers/pushSubscriptionController.js';

const router = express.Router();

// VAPID public key is intentionally public — browsers need it to create subscriptions.
router.get('/vapid-public-key', getVapidPublicKey);

// Subscribe / Unsubscribe — require auth so we can attach userId + role to the subscription
router.post('/subscribe', protect, subscribeToPush);
router.delete('/unsubscribe', protect, unsubscribeFromPush);

// Diagnostics — verify push is working end-to-end
router.get('/count', protect, countSubscriptions);      // How many subscriptions in DB?
router.post('/test', protect, sendTestPush);            // Send a test push to yourself

// Debug: see subscriptions for own account
router.get('/subscriptions', protect, getMySubscriptions);

export default router;
