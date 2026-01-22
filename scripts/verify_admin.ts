import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Staff } from '../src/models/Staff.js';
import connectDB from '../src/config/db.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const verifyAdmin = async () => {
    await connectDB();

    const admin = await Staff.findOne({ email: 'admin@smana.com' });

    if (!admin) {
        console.log('❌ Admin user NOT found!');
    } else {
        console.log('✅ Admin user found:', admin.email);
        console.log('Stored Hash:', admin.password);

        const isMatch = await bcrypt.compare('password123', admin.password || '');
        console.log('Password "password123" match:', isMatch ? '✅ YES' : '❌ NO');

        // Test manual hash comparison
        // const newHash = await bcrypt.hash('password123', 10);
        // console.log('New Hash for comparison:', newHash);
    }

    process.exit();
};

verifyAdmin();
