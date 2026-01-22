
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Room } from '../src/models/Room.js';
import connectDB from '../src/config/db.js';

dotenv.config();

connectDB();

const seedRooms = async () => {
    try {
        console.log('Seeding Rooms...');

        // Clear existing rooms only
        await Room.deleteMany();
        console.log('Cleared existing rooms.');

        const rooms = [];
        const roomTypes: any = ['Standard', 'Deluxe', 'Suite', 'Royal'];
        // 5 floors, 20 rooms each = 100 rooms
        for (let floor = 1; floor <= 5; floor++) {
            for (let r = 1; r <= 20; r++) {
                const roomNum = floor * 100 + r;
                const typeIndex = Math.floor(Math.random() * roomTypes.length);

                // Randomly assign some rooms as Occupied or Cleaning for realism
                let status = 'Available';
                const rand = Math.random();
                if (rand > 0.7) status = 'Occupied';
                else if (rand > 0.9) status = 'Cleaning';

                // We won't link guests for Occupied rooms in this dummy seed 
                // to avoid complexity, but dashboard should show them as Occupied.

                rooms.push({
                    roomNumber: roomNum.toString(),
                    type: roomTypes[typeIndex],
                    floor: floor,
                    price: [200, 350, 800, 1500][typeIndex], // Add some dummy pricing logic if model supports it
                    status: 'Available' // Set all to Available initially so we can test Check-in flow properly
                });
            }
        }

        await Room.create(rooms);
        console.log(`Successfully added ${rooms.length} rooms!`);

        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

seedRooms();
