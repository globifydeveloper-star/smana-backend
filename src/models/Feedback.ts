import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
    guestId: mongoose.Types.ObjectId;
    roomNumber: string;
    name: string;
    email?: string;
    phone?: string;
    rating: number;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
    {
        guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
        roomNumber: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String },
        phone: { type: String },
        rating: { type: Number, required: true, min: 1, max: 5 },
        description: { type: String, required: true },
    },
    { timestamps: true }
);

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
