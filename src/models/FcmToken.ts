/**
 * src/models/FcmToken.ts
 *
 * Stores Firebase Cloud Messaging (FCM) registration tokens for admin/staff users.
 * Replaces the old WebPush PushSubscription model (endpoint + p256dh + auth).
 *
 * One document per browser/device. The `token` field is unique — upserting by token
 * ensures we never store duplicates for the same device.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IFcmToken extends Document {
    userId: mongoose.Types.ObjectId;
    role: string;
    token: string;          // FCM registration token
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

const fcmTokenSchema = new Schema<IFcmToken>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        role: {
            type: String,
            required: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,   // One record per unique FCM token (per browser install)
        },
        userAgent: {
            type: String,
        },
    },
    { timestamps: true }
);

// Fast look-ups by role (fan-out) and by userId (user-specific messages)
fcmTokenSchema.index({ role: 1 });
fcmTokenSchema.index({ userId: 1 });

export const FcmTokenModel = mongoose.model<IFcmToken>('FcmToken', fcmTokenSchema);
