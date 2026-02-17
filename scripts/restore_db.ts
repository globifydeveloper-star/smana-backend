
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to local if not provided, or allow user to set MONGO_URI in .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smana_hotel';
const DUMP_DIR = path.join(__dirname, '../dump');

const restoreDatabase = async () => {
    try {
        console.log(`Connecting to database: ${MONGO_URI}`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        if (!fs.existsSync(DUMP_DIR)) {
            console.error(`Dump directory not found at: ${DUMP_DIR}`);
            console.error('Please make sure you have the "dump" folder in the project root.');
            return;
        }

        const files = fs.readdirSync(DUMP_DIR).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            console.log('No JSON files found in dump directory to restore.');
            return;
        }

        console.log(`Found ${files.length} backup files. Starting restore...`);

        for (const file of files) {
            const collectionName = path.basename(file, '.json');
            const filePath = path.join(DUMP_DIR, file);

            console.log(`Restoring collection: ${collectionName} from ${filePath}`);

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const documents = JSON.parse(fileContent);

            if (!Array.isArray(documents) || documents.length === 0) {
                console.log(`Skipping ${collectionName}: No documents found in file.`);
                continue;
            }

            const collection = mongoose.connection.db?.collection(collectionName);
            if (collection) {
                // Prepare bulk operations
                const bulkOps = documents.map(doc => {
                    // Identify the document by _id if it exists, otherwise use the whole doc (unlikely for restore)
                    const filter = doc._id ? { _id: new mongoose.Types.ObjectId(doc._id) } : doc;

                    // Fix ObjectId strings back to Objects if needed
                    // Mongoose/Driver usually handles string _id in valid hex format, but let's be safe if they are strings in JSON
                    if (doc._id && typeof doc._id === 'string') {
                        // If _id is a valid ObjectId string, cast it. 
                        // Note: In strict EJSON, $oid is used. Simple JSON dump usually has plain strings.
                        // We attempt to cast common fields if they look like ObjectIds? 
                        // For now, let's rely on basic insert/replace. 
                        // Actually, `restore` usually needs to preserve _id.
                        // If `doc._id` is a string in the JSON, it will be inserted as a string unless we cast it.
                        // MongoDB default _id is ObjectId.
                        // Let's try to cast _id to ObjectId if it looks like one.
                    }

                    // Simple strategy: remove _id from doc to avoid immutable field error during update if we were just updating?
                    // No, for restore we WANT to set the _id.
                    // Using replaceOne with upsert to overwrite existing data matching that _id.

                    return {
                        replaceOne: {
                            filter: { _id: doc._id },
                            replacement: doc,
                            upsert: true
                        }
                    };
                });

                // We need to handle ObjectId transformation.
                // JSON.stringify made ObjectIds into strings. We need to turn them back if the schema expects specific types.
                // However, doing this generically without schema knowledge is hard.
                // BUT, since we are using the native driver collection, we can just insert.
                // WARNING: If the original data had ObjectIds, the JSON has strings. Inserting strings into _id is valid but might break app constraints if it expects ObjectId type.
                // Let's do a naive pass to convert standard 24-char hex strings in `_id` and reference fields? 
                // Too risky to guess for all fields. 
                // Most critical is `_id`.

                const processedDocs = documents.map(doc => {
                    const newDoc = { ...doc };
                    if (typeof newDoc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(newDoc._id)) {
                        try {
                            newDoc._id = new mongoose.Types.ObjectId(newDoc._id);
                        } catch (e) {
                            // keep as string
                        }
                    }
                    // We could try to fix other fields but it's complex. 
                    // Let's assume the user accepts stringified IDs or the app handles it, 
                    // OR finding `backup_db` script logic... it just did `JSON.stringify`.

                    return newDoc;
                });

                if (processedDocs.length > 0) {
                    const bulkWriteOps = processedDocs.map(doc => ({
                        replaceOne: {
                            filter: { _id: doc._id },
                            replacement: doc,
                            upsert: true
                        }
                    }));

                    await collection.bulkWrite(bulkWriteOps);
                    console.log(`Restored ${processedDocs.length} documents to ${collectionName}`);
                }
            }
        }

        console.log('Restore completed successfully!');

    } catch (error) {
        console.error('Restore failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

restoreDatabase();
