import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Guest } from '../src/models/Guest.js';

dotenv.config();

const checkGuests = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel');
        console.log('MongoDB Connected');

        const guests = await Guest.find({});
        console.log(`Found ${guests.length} guests in the database.`);
        if (guests.length > 0) {
            console.log('Sample Guest:', JSON.stringify(guests[0], null, 2));
        } else {
            console.log('No guests found. Creating a test guest...');
            const testGuest = await Guest.create({
                name: 'Test Mobile User',
                email: 'mobile@test.com',
                phone: '+971500000000',
                password: 'password123',
                isCheckedIn: false
            });
            console.log('Created Test Guest:', testGuest.name);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkGuests();
