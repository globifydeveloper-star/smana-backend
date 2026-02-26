/**
 * src/config/firebaseAdmin.ts
 *
 * Initialises the Firebase Admin SDK once and exports the Messaging instance.
 * Two credential strategies are supported:
 *
 *  1. GOOGLE_APPLICATION_CREDENTIALS env var  →  path to the service-account JSON file
 *     (best for local dev when the file is on disk but you don't want to commit it)
 *
 *  2. Individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 *     → embed credentials directly in the environment, ideal for CI/hosting platforms
 *     where you cannot upload a file.
 *
 * For local development with the JSON file simply set:
 *   GOOGLE_APPLICATION_CREDENTIALS=../smana-app-firebase-adminsdk-fbsvc-a1cf6c2f37.json
 * in your .env file.
 */

import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { cert } from 'firebase-admin/app';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

function initFirebaseAdmin() {
    if (admin.apps.length > 0) {
        // Already initialised — return the existing app
        messagingInstance = getMessaging();
        return;
    }

    try {
        // Strategy 1: path-based credential file
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (credPath) {
            const resolvedPath = path.isAbsolute(credPath)
                ? credPath
                : path.resolve(__dirname, '../../..', credPath);
            admin.initializeApp({
                credential: admin.credential.cert(resolvedPath),
            });
        }
        // Strategy 2: individual env vars
        else if (
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
        ) {
            admin.initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Env vars escape newlines as \n — unescape them
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            console.warn(
                '[Firebase Admin] ⚠️  No credentials configured.\n' +
                '  Set GOOGLE_APPLICATION_CREDENTIALS (path to JSON) OR\n' +
                '  set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.\n' +
                '  FCM push notifications will be DISABLED.'
            );
            return;
        }

        messagingInstance = getMessaging();
        console.log('[Firebase Admin] ✅ Firebase Admin SDK initialised');
    } catch (err) {
        console.error('[Firebase Admin] ❌ Failed to initialise Firebase Admin:', err);
    }
}

// Initialise on module load
initFirebaseAdmin();

/**
 * Returns the Firebase Messaging instance.
 * Returns null if the SDK failed to initialise (credentials not configured).
 */
export function getAdminMessaging(): ReturnType<typeof getMessaging> | null {
    if (!messagingInstance && admin.apps.length > 0) {
        messagingInstance = getMessaging();
    }
    return messagingInstance;
}

export default admin;
