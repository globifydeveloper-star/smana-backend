import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runManualAutoCheckout } from '../services/autoCheckoutService.js';

dotenv.config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smana');
        console.log('Connected to DB. Running manual checkout...');
        
        await runManualAutoCheckout();
        
        console.log('Finished.');
        process.exit(0);
    } catch (error) {
        console.error('Error during manual checkout:', error);
        process.exit(1);
    }
}

main();
