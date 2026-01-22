
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Guest } from '../src/models/Guest.js';
// import { User } from './src/models/User.js'; // Assuming User model exists, let's try to find it.

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel');
        console.log('Connected to MongoDB');

        const guests = await Guest.find({});
        console.log(`Found ${guests.length} guests in 'guests' collection:`);
        guests.forEach(g => console.log(` - ${g.name} (${g.email})`));

        // If there is a User model, we should check it too. 
        // I'll try to dynamically access the collection if I can't import the model easily without strictly knowing the path, 
        // but assume 'users' collection exists.
        const usersCollection = mongoose.connection.collection('users');
        const users = await usersCollection.find({}).toArray();
        console.log(`\nFound ${users.length} users in 'users' collection:`);
        users.forEach((u: any) => console.log(` - ${u.name} (${u.email})`));

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
