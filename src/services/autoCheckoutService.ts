import cron from 'node-cron';
import moment from 'moment-timezone';
import { Guest } from '../models/Guest.js';
import { Room } from '../models/Room.js';
import { socketService } from './socketService.js';
import { createNotification } from '../controllers/notificationController.js';

const HOTEL_TIMEZONE = process.env.HOTEL_TIMEZONE || 'Asia/Dubai';

/**
 * Start the auto checkout cron job
 */
export function startAutoCheckoutCron() {
    console.log(`🕒 Auto Checkout Cron: Starting... (Timezone: ${HOTEL_TIMEZONE})`);

    // Run every 5 minutes to scan for checkouts due at or after 12:00 PM
    cron.schedule('*/5 * * * *', async () => {
        try {
            await processAutoCheckouts();
        } catch (error) {
            console.error('❌ Auto Checkout Cron: Error during execution:', error);
        }
    });

    console.log('✅ Auto Checkout Cron: Scheduled (runs every 5 mins)');
}

/**
 * Process auto checkouts for guests who are past due.
 */
async function processAutoCheckouts() {
    const now = moment().tz(HOTEL_TIMEZONE);
    
    // Only automatically checkout guests if the current time in the hotel's timezone is >= 12:00 PM
    if (now.hour() < 12) {
        return;
    }

    try {
        // Find guests who are checked in and have a checkout date
        const checkedInGuests = await Guest.find({
            isCheckedIn: true,
            checkOutDate: { $exists: true, $ne: null }
        });

        if (checkedInGuests.length === 0) {
            return;
        }

        const todayStart = now.clone().startOf('day');

        for (const guest of checkedInGuests) {
            if (!guest.checkOutDate) continue;

            const checkOutDateMoment = moment.tz(guest.checkOutDate, HOTEL_TIMEZONE).startOf('day');
            
            // If the checkout date is today or earlier (and time is >= 12 PM as verified above)
            if (checkOutDateMoment.isSameOrBefore(todayStart)) {
                await performAutoCheckout(guest);
            }
        }
    } catch (error) {
        console.error('❌ Auto Checkout Cron: Error processing checkouts:', error);
        throw error;
    }
}

/**
 * Performs actual checkout operations for a specific guest
 */
async function performAutoCheckout(guest: any) {
    const roomNumber = guest.roomNumber;
    
    // Update guest
    guest.isCheckedIn = false;
    guest.roomNumber = undefined;
    await guest.save();

    console.log(`✅ Auto Checkout: Checked out guest ${guest.name} (${guest._id}) from Room ${roomNumber}`);

    // Update room
    if (roomNumber) {
        const room = await Room.findOne({ roomNumber });
        if (room) {
            room.status = 'Cleaning';
            room.currentGuestId = undefined;
            await room.save();
            socketService.emit('room-status-changed', room);
            
            console.log(`🧹 Auto Checkout: Moved Room ${roomNumber} to Cleaning status`);
        }
    }

    // Socket Emits
    socketService.emit('guest-checked-out', guest);

    // Notifications
    await createNotification(
        `Auto Checkout Room ${roomNumber}`,
        `System automatically checked out ${guest.name} at 12:00 PM.`,
        'info',
        'Admin', // use Admin as the sender model
        undefined,
        guest._id.toString(),
        `/dashboard/guests`
    );
}

/**
 * Manual trigger for testing
 */
export async function runManualAutoCheckout() {
    console.log('🕒 Auto Checkout: Running manual execution...');
    await processAutoCheckouts();
    console.log('✅ Auto Checkout: Manual execution complete');
}
