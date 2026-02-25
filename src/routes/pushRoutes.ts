import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    getVapidPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
    getMySubscriptions,
} from '../controllers/pushSubscriptionController.js';

const router = express.Router();

// Public key — fetched before subscription is created (no auth needed technically,
// but keeping behind protect to avoid any bot scraping)
router.get('/vapid-public-key', protect, getVapidPublicKey);

// Subscribe / Unsubscribe
router.post('/subscribe', protect, subscribeToPush);
router.delete('/unsubscribe', protect, unsubscribeFromPush);

// Admin utility — see subscriptions for own account
router.get('/subscriptions', protect, getMySubscriptions);

export default router;
