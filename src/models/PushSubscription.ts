import mongoose, { Document, Schema } from 'mongoose';

export interface IPushSubscription extends Document {
    userId: mongoose.Types.ObjectId;
    role: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    userAgent?: string;
    createdAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'role', // Staff or Guest model depending on role
        },
        role: {
            type: String,
            required: true,
        },
        endpoint: {
            type: String,
            required: true,
            unique: true, // One subscription per browser install
        },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
        userAgent: {
            type: String,
        },
    },
    { timestamps: true }
);

// Index for fast role-based lookups when sending pushes
pushSubscriptionSchema.index({ role: 1 });
pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel = mongoose.model<IPushSubscription>(
    'PushSubscription',
    pushSubscriptionSchema
);
