import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    subscribeToPush,
    unsubscribeFromPush,
    getMySubscriptions,
    countSubscriptions,
    sendTestPush,
} from '../controllers/pushSubscriptionController.js';

const router = express.Router();

// Register / update an FCM token for the logged-in user's device
router.post('/subscribe', protect, subscribeToPush);

// Remove an FCM token (logout or permission revoked)
router.delete('/unsubscribe', protect, unsubscribeFromPush);

// Diagnostics
router.get('/count', protect, countSubscriptions);  // How many FCM tokens in DB?
router.post('/test', protect, sendTestPush);         // Send a test push to yourself

// Debug: see token records for own account
router.get('/subscriptions', protect, getMySubscriptions);

export default router;
