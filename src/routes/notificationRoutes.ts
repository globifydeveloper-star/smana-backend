import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All notification routes are protected

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
