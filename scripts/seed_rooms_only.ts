
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

        const rooms: any[] = [];

        type BedType = 'Twin Bed' | 'Queen Bed' | 'King Bed';
        type SpecialFeature = 'Bath Tub' | 'Handicap' | 'Not Required';

        const bedTypeByCategory: Record<string, BedType> = {
            Standard: 'Twin Bed',
            Deluxe: 'Queen Bed',
            Suite: 'King Bed',
            Royal: 'King Bed',
        };

        const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Royal'];

        // 4 floors, 40 rooms each: 101-140, 201-240, 301-340, 401-440
        for (let floor = 1; floor <= 4; floor++) {
            for (let r = 1; r <= 40; r++) {
                const roomNum = floor * 100 + r;
                const typeIndex = Math.floor(Math.random() * roomTypes.length);
                const type = roomTypes[typeIndex];

                // ~20% of rooms have no bedType assigned → they are Unavailable
                const hasBedType = Math.random() > 0.20;
                const bedType = hasBedType ? bedTypeByCategory[type] : undefined;
                const status = hasBedType ? 'Available' : 'Unavailable';

                // Assign special features only to rooms that have a bed type
                let specialFeatures: SpecialFeature[] = [];
                if (hasBedType) {
                    const roll = Math.random();
                    if (roll < 0.15) {
                        specialFeatures = ['Bath Tub'];
                    } else if (roll < 0.20) {
                        specialFeatures = ['Handicap'];
                    } else if (roll < 0.25) {
                        specialFeatures = ['Not Required'];
                    }
                }

                rooms.push({
                    roomNumber: roomNum.toString(),
                    type,
                    floor,
                    ...(bedType ? { bedType } : {}),
                    specialFeatures,
                    status,
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
