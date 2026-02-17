import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    recipient?: mongoose.Types.ObjectId; // Specific user
    role?: string; // Broadcast to role (Admin, Receptionist, etc.)
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    isRead: boolean;
    referenceId?: string; // ID of related order, room, etc.
    link?: string; // Link to the relevant page
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        recipient: { type: Schema.Types.ObjectId, ref: 'Staff' },
        role: { type: String },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
        isRead: { type: Boolean, default: false },
        referenceId: { type: String },
        link: { type: String },
    },
    { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
