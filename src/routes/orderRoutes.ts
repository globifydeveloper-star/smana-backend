import express from 'express';
import {
    placeOrder,
    getOrders,
    getMyOrders,
    updateOrderStatus,
    cleanupPendingOrders,
} from '../controllers/orderController.js';
import { protect, admin, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, placeOrder)
    .get(protect, authorize('Admin', 'Chef', 'Receptionist', 'Manager'), getOrders); // Staff can see all, maybe filter by role later

router.get('/my', protect, getMyOrders);

router.route('/:id/status')
    .put(protect, authorize('Admin', 'Chef', 'Receptionist', 'Manager'), updateOrderStatus); // Staff/Admin

router.post('/cleanup-pending', protect, admin, cleanupPendingOrders);

export default router;
