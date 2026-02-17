
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel';
const BACKUP_DIR = path.join(__dirname, '../dump');

const backupDatabase = async () => {
    try {
        console.log(`Connecting to database: ${MONGO_URI}`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const collections = await mongoose.connection.db?.listCollections().toArray();

        if (!collections) {
            console.log('No collections found');
            return;
        }

        console.log(`Found ${collections.length} collections. Starting backup...`);

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`Backing up collection: ${collectionName}`);

            const collection = mongoose.connection.db?.collection(collectionName);
            if (collection) {
                const data = await collection.find({}).toArray();
                const filePath = path.join(BACKUP_DIR, `${collectionName}.json`);

                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`Saved ${data.length} documents to ${filePath}`);
            }
        }

        console.log('Backup completed successfully!');
        console.log(`Backup files are located in: ${BACKUP_DIR}`);

    } catch (error) {
        console.error('Backup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

backupDatabase();
