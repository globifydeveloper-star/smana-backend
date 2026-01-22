import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { hyperPayService, CheckoutRequest } from '../services/hyperpay.service.js';
import { FoodOrder } from '../models/FoodOrder.js';
import { MenuItem } from '../models/MenuItem.js';
import { z } from 'zod';

// Validation schemas
const createCheckoutSchema = z.object({
    items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().min(1)
    })),
    roomNumber: z.string(),
    notes: z.string().optional(),
    currency: z.enum(['AED']).default('AED'), // Production: AED only
    customerEmail: z.string().email(),
    billingAddress: z.object({
        givenName: z.string().min(1),
        surname: z.string().min(1),
        street1: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        country: z.string().length(2), // ISO Alpha-2 country code
        postcode: z.string().min(1)
    })
});

// @desc    Create HyperPay checkout session and prepare order
// @route   POST /api/payments/checkout
// @access  Private
export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
    const result = createCheckoutSchema.safeParse(req.body);

    if (!result.success) {
        res.status(400);
        throw new Error('Invalid checkout data: ' + result.error.message);
    }

    const { items, roomNumber, notes, currency, customerEmail, billingAddress } = result.data;
    const userId = (req.user as any)._id;

    // Calculate total and prepare order items
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (!menuItem) {
            res.status(400);
            throw new Error(`Menu item not found: ${item.menuItemId}`);
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
            menuItemId: menuItem._id,
            name: menuItem.name,
            quantity: item.quantity,
            price: menuItem.price
        });
    }

    try {
        // Create pending order (not confirmed until payment succeeds)
        const order = await FoodOrder.create({
            guestId: userId,
            roomNumber,
            items: orderItems,
            totalAmount,
            notes,
            paymentMethod: 'HyperPay',
            paymentStatus: 'pending',
            currency,
            status: 'Pending'
        });

        const checkoutData: CheckoutRequest = {
            amount: totalAmount.toFixed(2),
            currency,
            paymentType: 'DB',
            merchantTransactionId: order._id.toString(),
            customerEmail,
            billingAddress
        };

        const checkoutResponse = await hyperPayService.createCheckout(checkoutData);

        // Update order with checkout ID
        order.checkoutId = checkoutResponse.id;
        await order.save();

        res.status(200).json({
            success: true,
            checkoutId: checkoutResponse.id,
            integrity: checkoutResponse.integrity, // PCI DSS v4.0 - SRI hash for script tag
            orderId: order._id.toString(),
            amount: totalAmount.toFixed(2),
            currency,
            result: checkoutResponse.result
        });
    } catch (error: any) {
        console.error('Checkout creation error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to create checkout');
    }
});

// @desc    Get payment status
// @route   GET /api/payments/status/:checkoutId
// @access  Private
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { checkoutId } = req.params;

    if (!checkoutId) {
        res.status(400);
        throw new Error('Checkout ID is required');
    }

    // Find order with this checkout ID
    const order = await FoodOrder.findOne({ checkoutId });
    if (!order) {
        res.status(404);
        throw new Error('Order not found for this checkout ID');
    }

    // Verify order belongs to current user
    const userId = (req.user as any)._id;
    if (order.guestId.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this payment');
    }

    try {
        const currency = order.currency || 'AED';
        const paymentStatus = await hyperPayService.getPaymentStatus(checkoutId, currency);

        // Update order based on payment status
        const isSuccess = hyperPayService.isPaymentSuccessful(paymentStatus.result.code);
        const isPending = hyperPayService.isPaymentPending(paymentStatus.result.code);

        if (isSuccess) {
            order.paymentStatus = 'success';
            order.transactionId = paymentStatus.id;
            order.paymentResponse = paymentStatus;
            order.status = 'Pending'; // Confirmed order, kitchen will process
            order.paymentCompletedAt = new Date(); // Mark payment as completed
            await order.save();

            // Emit socket event for new order
            const { socketService } = await import('../services/socketService.js');
            const populatedOrder = await order.populate('guestId', 'name');
            socketService.emit('new-food-order', populatedOrder);
        } else if (!isPending) {
            order.paymentStatus = 'failed';
            order.paymentResponse = paymentStatus;
            order.status = 'Cancelled'; // Cancel failed payment orders
            order.paymentCompletedAt = new Date(); // Mark payment as completed (failed)
            await order.save();
        }

        res.status(200).json({
            success: isSuccess,
            pending: isPending,
            paymentStatus: isSuccess ? 'success' : isPending ? 'pending' : 'failed',
            result: paymentStatus.result,
            transactionId: paymentStatus.id,
            paymentBrand: paymentStatus.paymentBrand,
            amount: paymentStatus.amount,
            currency: paymentStatus.currency,
            orderId: order._id.toString()
        });
    } catch (error: any) {
        console.error('Payment status error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to get payment status');
    }
});

/**
 * Validate HyperPay webhook signature to ensure request authenticity
 * @param signature - Signature from request header
 * @param payload - Request body as string
 * @returns boolean indicating if signature is valid
 */
function validateHyperPaySignature(signature: string | undefined, payload: string): boolean {
    if (!signature) {
        console.error('[WebhookSecurity] No signature provided');
        return false;
    }

    const webhookSecret = process.env.HYPERPAY_WEBHOOK_SECRET;

    // If no webhook secret configured, log warning but allow (for backwards compatibility)
    if (!webhookSecret) {
        console.warn('[WebhookSecurity] ⚠️ HYPERPAY_WEBHOOK_SECRET not configured - webhook validation disabled!');
        return true;
    }

    try {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        const isValid = signature === expectedSignature;

        if (!isValid) {
            console.error('[WebhookSecurity] ❌ Signature mismatch', {
                provided: signature.substring(0, 10) + '...',
                expected: expectedSignature.substring(0, 10) + '...'
            });
        } else {
            console.log('[WebhookSecurity] ✅ Signature validated');
        }

        return isValid;
    } catch (error) {
        console.error('[WebhookSecurity] Error validating signature:', error);
        return false;
    }
}

// @desc    Update payment status (webhook/callback)
// @route   POST /api/payments/callback/:orderId
// @access  Public (validated via HMAC signature)
export const paymentCallback = asyncHandler(async (req: Request, res: Response) => {
    // Validate webhook signature for security
    const signature = req.headers['x-hyperpay-signature'] as string | undefined;
    const payload = JSON.stringify(req.body);

    if (!validateHyperPaySignature(signature, payload)) {
        console.error('[PaymentCallback] ❌ Unauthorized callback attempt', {
            orderId: req.params.orderId,
            ip: req.ip
        });
        res.status(401);
        throw new Error('Invalid webhook signature');
    }

    const { orderId } = req.params;
    const { checkoutId } = req.body;

    console.log('[PaymentCallback] Processing callback for order:', orderId);

    const order = await FoodOrder.findById(orderId);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.checkoutId !== checkoutId) {
        res.status(400);
        throw new Error('Checkout ID mismatch');
    }

    try {
        const currency = order.currency || 'AED';
        const paymentStatus = await hyperPayService.getPaymentStatus(checkoutId, currency);

        const isSuccess = hyperPayService.isPaymentSuccessful(paymentStatus.result.code);

        if (isSuccess) {
            order.paymentStatus = 'success';
            order.transactionId = paymentStatus.id;
            order.paymentResponse = paymentStatus;
            order.status = 'Pending'; // Confirmed order - ready for kitchen

            // Emit socket event for new order (same as getPaymentStatus)
            const { socketService } = await import('../services/socketService.js');
            const populatedOrder = await order.populate('guestId', 'name');
            socketService.emit('new-food-order', populatedOrder);
        } else {
            order.paymentStatus = 'failed';
            order.paymentResponse = paymentStatus;
            order.status = 'Cancelled'; // Cancel failed payment orders
        }

        await order.save();

        console.log('[PaymentCallback] ✅ Order updated:', {
            orderId: order._id,
            paymentStatus: order.paymentStatus,
            status: order.status
        });

        res.status(200).json({
            success: true,
            paymentStatus: order.paymentStatus,
            orderId: order._id
        });
    } catch (error: any) {
        console.error('[PaymentCallback] Error processing callback:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to process payment callback');
    }
});

// @desc    Init card registration (save card)
// @route   POST /api/payments/registration
// @access  Private
export const createRegistration = asyncHandler(async (req: Request, res: Response) => {
    const { customerEmail, billingAddress } = req.body;

    // In a real app, validate these. billingAddress is optional but recommended.

    try {
        const response = await hyperPayService.createRegistration(customerEmail, billingAddress);
        res.status(200).json({
            success: true,
            checkoutId: response.id,
            // Registration script URL has /registration appended
            scriptUrl: `${process.env.HYPERPAY_BASE_URL || 'https://eu-test.oppwa.com'}/v1/paymentWidgets.js?checkoutId=${response.id}/registration`
        });
    } catch (error: any) {
        console.error('Registration init error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to init registration');
    }
});

// @desc    Check registration status and save token
// @route   GET /api/payments/registration/:checkoutId
// @access  Private
export const checkRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { checkoutId } = req.params;
    const userId = (req.user as any)._id;

    try {
        // 1. Get status from HyperPay
        const status = await hyperPayService.getRegistrationStatus(checkoutId);

        // 2. Check success
        const isSuccess = hyperPayService.isPaymentSuccessful(status.result.code);

        if (isSuccess && status.id) {
            // 3. Save token (registrationId) to user profile
            // NOTE: You'll need to implement a mechanism to store 'cards' in your Guest/User model.
            // For now, I'll log it and return it.
            console.log('[Registration] Success! Token:', status.id);

            // TODO: Save to DB: User.paymentMethods.push({ token: status.id, last4: status.card.last4Digits, brand: status.paymentBrand })
            // await Guest.findByIdAndUpdate(userId, { $push: { savedCards: { ... } } });
        }

        res.status(200).json({
            success: isSuccess,
            result: status.result,
            registrationId: status.id,
            card: status.card,
            paymentBrand: status.paymentBrand
        });
    } catch (error: any) {
        console.error('Registration status error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to check registration');
    }
});

// @desc    Pay with saved token
// @route   POST /api/payments/token
// @access  Private
export const payWithSavedCard = asyncHandler(async (req: Request, res: Response) => {
    const { registrationId, amount, currency = 'AED' } = req.body;

    if (!registrationId || !amount) {
        res.status(400);
        throw new Error('Missing registrationId or amount');
    }

    try {
        const paymentStatus = await hyperPayService.payWithToken(registrationId, amount, currency);
        const isSuccess = hyperPayService.isPaymentSuccessful(paymentStatus.result.code);
        const isPending = hyperPayService.isPaymentPending(paymentStatus.result.code);

        res.status(200).json({
            success: isSuccess,
            pending: isPending,
            paymentStatus: isSuccess ? 'success' : isPending ? 'pending' : 'failed',
            result: paymentStatus.result,
            transactionId: paymentStatus.id
        });

    } catch (error: any) {
        console.error('Token payment error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to pay with token');
    }
});
