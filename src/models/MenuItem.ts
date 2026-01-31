import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
    name: string;
    description?: string;
    price: number;
    category: string;
    imageUrl?: string;
    isActive: boolean;
    allergens: string[];
    allergyInfo?: string;
}

const menuItemSchema = new Schema<IMenuItem>(
    {
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        category: { type: String, required: true }, // e.g., 'Appetizers', 'Main Course'
        imageUrl: { type: String },
        isActive: { type: Boolean, default: true },
        allergens: [{ type: String }],
        allergyInfo: { type: String }, // Added allergy materials info
    },
    { timestamps: true }
);

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
