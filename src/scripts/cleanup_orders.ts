
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodOrder } from '../models/FoodOrder.js';

dotenv.config();

const runCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel');
        console.log('MongoDB Connected');

        const result = await FoodOrder.updateMany(
            { paymentStatus: 'pending' },
            {
                $set: {
                    status: 'Cancelled',
                    paymentStatus: 'cancelled'
                }
            }
        );

        console.log(`Cleanup complete. Modified ${result.modifiedCount} orders.`);
        process.exit(0);
    } catch (error) {
        console.error('Error running cleanup:', error);
        process.exit(1);
    }
};

runCleanup();
