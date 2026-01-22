import { FoodOrder } from '../models/FoodOrder.js';

/**
 * Order Cleanup Service
 * 
 * Automatically cancels orders with pending payment status after 5 minutes
 * Prevents orphaned orders from cluttering the system
 */

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the order cleanup service
 */
export function startOrderCleanupService() {
    console.log('🧹 Order Cleanup Service: Starting...');

    // Run cleanup every 60 seconds
    cleanupInterval = setInterval(async () => {
        try {
            await cleanupPendingOrders();
        } catch (error) {
            console.error('❌ Order Cleanup Service: Error during cleanup:', error);
        }
    }, 60000); // 60 seconds

    console.log('✅ Order Cleanup Service: Started (runs every 60s)');
}

/**
 * Stop the order cleanup service
 */
export function stopOrderCleanupService() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('🛑 Order Cleanup Service: Stopped');
    }
}

/**
 * Clean up pending payment orders older than 5 minutes
 */
async function cleanupPendingOrders() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
        // Find orders that:
        // 1. Have pending payment status
        // 2. Are in Pending order status
        // 3. Were created more than 5 minutes ago
        // 4. Don't have a paymentCompletedAt timestamp (payment never completed)
        const expiredOrders = await FoodOrder.find({
            paymentStatus: 'pending',
            status: 'Pending',
            createdAt: { $lt: fiveMinutesAgo },
            $or: [
                { paymentCompletedAt: null },
                { paymentCompletedAt: { $exists: false } }
            ]
        });

        if (expiredOrders.length === 0) {
            return; // No orders to clean up
        }

        console.log(`🧹 Order Cleanup: Found ${expiredOrders.length} expired order(s)`);

        // Update each expired order
        for (const order of expiredOrders) {
            order.status = 'Cancelled';
            order.paymentStatus = 'failed';
            order.paymentCompletedAt = new Date(); // Mark as processed
            await order.save();

            console.log(
                `✅ Order Cleanup: Cancelled order ${order._id} ` +
                `(created ${order.createdAt.toISOString()}, ` +
                `amount: ${order.totalAmount} ${order.currency || 'AED'})`
            );
        }

        console.log(`✅ Order Cleanup: Processed ${expiredOrders.length} expired order(s)`);
    } catch (error) {
        console.error('❌ Order Cleanup: Error processing expired orders:', error);
        throw error;
    }
}

/**
 * Manual cleanup function (for testing or admin use)
 */
export async function runManualCleanup() {
    console.log('🧹 Order Cleanup: Running manual cleanup...');
    await cleanupPendingOrders();
    console.log('✅ Order Cleanup: Manual cleanup complete');
}
