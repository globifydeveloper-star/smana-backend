import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    getVapidPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
    getMySubscriptions,
} from '../controllers/pushSubscriptionController.js';

const router = express.Router();

// VAPID public key is intentionally public — browsers need it to create subscriptions.
// It is NOT a secret. Never put protect() here; doing so causes silent subscription
// failures when auth cookies expire or have SameSite issues.
router.get('/vapid-public-key', getVapidPublicKey);

// Subscribe / Unsubscribe — require auth so we can attach userId + role to the subscription
router.post('/subscribe', protect, subscribeToPush);
router.delete('/unsubscribe', protect, unsubscribeFromPush);

// Debug: see subscriptions for own account
router.get('/subscriptions', protect, getMySubscriptions);

export default router;
