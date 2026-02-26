/**
 * scripts/dropPushSubscriptions.ts
 *
 * One-time migration script: drops the legacy `pushsubscriptions` collection
 * from MongoDB now that FCM tokens are stored in `fcmtokens`.
 *
 * Run once after confirming FCM push notifications are working:
 *   npx tsx src/scripts/dropPushSubscriptions.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

async function run() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('❌ MONGO_URI is not set in .env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB…');
    await mongoose.connect(uri);

    const db = mongoose.connection.db!;
    const collections = await db.listCollections({ name: 'pushsubscriptions' }).toArray();

    if (collections.length === 0) {
        console.log('ℹ️  Collection pushsubscriptions does not exist — nothing to drop.');
    } else {
        await db.dropCollection('pushsubscriptions');
        console.log('✅ Dropped collection: pushsubscriptions');
    }

    await mongoose.disconnect();
    console.log('Done.');
}

run().catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
