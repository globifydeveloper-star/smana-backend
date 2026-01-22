
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const migrate = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel');
        console.log('Connected.');

        const usersColl = mongoose.connection.collection('users');
        const guestsColl = mongoose.connection.collection('guests');
        const staffColl = mongoose.connection.collection('staffs');

        const users = await usersColl.find({}).toArray();
        console.log(`Found ${users.length} users to potentialy migrate.`);

        for (const user of users) {
            // Normalized email check
            const email = user.email.toLowerCase();

            // Skip if admin/staff
            // Check by email in staff collection
            const isStaff = await staffColl.findOne({ email: new RegExp(`^${email}$`, 'i') });
            if (isStaff) {
                console.log(`Skipping staff/admin: ${user.email}`);
                continue;
            }

            // Skip if already in guests
            const exists = await guestsColl.findOne({ email: new RegExp(`^${email}$`, 'i') });
            if (exists) {
                console.log(`Skipping existing guest: ${user.email}`);
                continue;
            }

            console.log(`Migrating user to guests: ${user.email}`);

            // Insert bypassing mongoose middleware (to keep hash)
            await guestsColl.insertOne({
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                password: user.password, // Keep existing hash
                isCheckedIn: false,
                roomNumber: null,
                checkInDate: null,
                checkOutDate: null,
                createdAt: user.createdAt || new Date(),
                updatedAt: new Date(),
                __v: 0
            });
        }

        console.log("Migration complete.");
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
