import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FoodOrder } from '../models/FoodOrder.js';
import { hyperPayService } from '../services/hyperpay.service.js';
const router = Router();
/**
 * Middleware: Admin API Key Authentication
 */
function requireAdminKey(req: Request, res: Response, next: Function) {
    const apiKey = req.headers['x-admin-api-key'] as string;
    const validKey = process.env.ADMIN_API_KEY;
    if (!validKey) {
        console.warn('⚠️  ADMIN_API_KEY not set - admin routes are INSECURE!');
    }
    if (validKey && apiKey !== validKey) {
        res.status(401).json({ error: 'Unauthorized - Invalid API key' });
        return;
    }
    next();
}
// Apply admin authentication to all routes
router.use(requireAdminKey);
/**
 * @desc    Get all orders with filters and pagination
 * @route   GET /api/admin/orders
 * @access  Admin
 */
router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
    const {
        status,
        paymentStatus,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;
    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    // Execute query
    const [orders, total] = await Promise.all([
        FoodOrder.find(query)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('guestId', 'name email')
            .lean(),
        FoodOrder.countDocuments(query)
    ]);
    res.json({
        orders,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));
/**
 * @desc    Get single order details
 * @route   GET /api/admin/orders/:id
 * @access  Admin
 */
router.get('/orders/:id', asyncHandler(async (req: Request, res: Response) => {
    const order = await FoodOrder.findById(req.params.id)
        .populate('guestId', 'name email phone')
        .lean();
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    res.json(order);
}));
/**
 * @desc    Resync order with HyperPay
 * @route   POST /api/admin/orders/:id/resync
 * @access  Admin
 */
router.post('/orders/:id/resync', asyncHandler(async (req: Request, res: Response) => {
    const order = await FoodOrder.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    if (!order.checkoutId) {
        res.status(400);
        throw new Error('No checkoutId found for this order');
    }
    try {
        // Query HyperPay for latest status
        const paymentStatus = await hyperPayService.getPaymentStatus(
            order.checkoutId,
            order.currency || 'AED'
        );
        const isSuccess = hyperPayService.isPaymentSuccessful(paymentStatus.result.code);
        const isPending = hyperPayService.isPaymentPending(paymentStatus.result.code);
        // Update order
        const oldStatus = order.paymentStatus;
        if (isSuccess) {
            order.paymentStatus = 'success';
            order.transactionId = paymentStatus.id;
            order.status = 'Pending';
        } else if (!isPending) {
            order.paymentStatus = 'failed';
            order.status = 'Cancelled';
        }
        order.paymentResponse = paymentStatus;
        await order.save();
        res.json({
            success: true,
            orderId: order._id,
            oldStatus,
            newStatus: order.paymentStatus,
            resultCode: paymentStatus.result.code,
            paymentStatus
        });
    } catch (error: any) {
        console.error('Resync error:', error);
        res.status(500);
        throw new Error(`Failed to resync: ${error.message}`);
    }
}));
/**
 * @desc    Get payment statistics
 * @route   GET /api/admin/stats
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await FoodOrder.aggregate([
        {
            $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' }
            }
        }
    ]);
    const recentOrders = await FoodOrder.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('_id roomNumber totalAmount paymentStatus createdAt')
        .lean();
    res.json({
        stats,
        recentOrders,
        timestamp: new Date()
    });
}));
export default router;