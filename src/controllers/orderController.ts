import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FoodOrder, IOrderItem } from '../models/FoodOrder.js';
import { MenuItem } from '../models/MenuItem.js';
import { createOrderSchema } from '../validation/schemas.js';
import { socketService } from '../services/socketService.js';
import { createNotification } from './notificationController.js';
import mongoose from 'mongoose';

// @desc    Place a new food order
// @route   POST /api/orders
// @access  Private (Guest/Staff)
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
    // Basic validation of body structure
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error('Invalid order data: ' + result.error.message);
    }

    // In a real app we would get guestId from req.user (jwt)
    // For now assuming req.user is populated by middleware
    // If guest is not logged in but just supplying roomNumber, we might need logic to find active guest for room.
    // Assuming authenticated flow:

    const { items: rawItems, notes, paymentMethod } = result.data;
    // Security Fix: Trust server-side roomNumber for Guests, not the one sent by client
    // If it's a staff member (who might not have a roomNumber on their profile), we might allow them to specify it?
    // For now, assuming this endpoint is primarily for Guests or we prioritize the user's assigned room.

    // Check if user is a guest with an assigned room
    const user = req.user as any;
    let roomNumber = result.data.roomNumber; // Default to body for Staff/Admin if they use this

    // Security Enforcement: ALWAYS override roomNumber from authenticated Guest profile
    if (user && user.role === 'Guest') {
        if (!user.roomNumber) {
            res.status(403);
            throw new Error('Guest is not currently checked into a room.');
        }
        roomNumber = user.roomNumber;
    }

    const guestId = user ? user._id : null;

    if (!guestId) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    let totalAmount = 0;
    const orderItems: IOrderItem[] = [];

    // Verify items and calculate total
    for (const item of rawItems) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (!menuItem) {
            res.status(400);
            throw new Error(`Menu item not found: ${item.menuItemId}`);
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
            menuItemId: menuItem._id as mongoose.Types.ObjectId,
            name: menuItem.name,
            quantity: item.quantity,
            price: menuItem.price
        });
    }

    const order = await FoodOrder.create({
        guestId,
        roomNumber,
        items: orderItems,
        totalAmount,
        notes,
        paymentMethod
    });

    if (order) {
        // Populate guest details for the socket event if needed
        const populatedOrder = await order.populate('guestId', 'name');
        socketService.emit('new-food-order', populatedOrder);

        // Notify Chef
        await createNotification(
            `New Order #${populatedOrder.roomNumber}`,
            `New food order from Room ${populatedOrder.roomNumber}.`,
            'info',
            'Chef',
            undefined,
            populatedOrder._id.toString(),
            `/dashboard/kitchen`
        );
        // Notify Admin
        await createNotification(
            `New Order #${populatedOrder.roomNumber}`,
            `New food order from Room ${populatedOrder.roomNumber}.`,
            'info',
            'Admin',
            undefined,
            populatedOrder._id.toString(),
            `/dashboard/orders`
        );
        res.status(201).json(populatedOrder);
    } else {
        res.status(400);
        throw new Error('Invalid order data');
    }
});

// @desc    Get all orders (Staff)
// @route   GET /api/orders
// @access  Private/Staff
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const count = await FoodOrder.countDocuments({});
    const orders = await FoodOrder.find({})
        .populate('guestId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    res.json({
        orders,
        page,
        pages: Math.ceil(count / limit),
        total: count
    });
});

// @desc    Get orders for a guest
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const orders = await FoodOrder.find({ guestId: (req.user as any)._id }).sort({ createdAt: -1 });
    res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Staff
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const order = await FoodOrder.findById(req.params.id);

    if (order) {
        order.status = status;
        const updatedOrder = await order.save();
        const populatedOrder = await updatedOrder.populate('guestId', 'name');
        socketService.emit('order-status-changed', populatedOrder);
        res.json(populatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Cleanup pending orders (Migrate to Cancelled)
// @route   POST /api/orders/cleanup-pending
// @access  Private/Admin
export const cleanupPendingOrders = asyncHandler(async (req: Request, res: Response) => {
    const result = await FoodOrder.updateMany(
        { paymentStatus: 'pending' },
        {
            $set: {
                status: 'Cancelled',
                paymentStatus: 'cancelled'
            }
        }
    );

    res.json({
        message: 'Cleanup successful',
        modifiedCount: result.modifiedCount
    });
});
