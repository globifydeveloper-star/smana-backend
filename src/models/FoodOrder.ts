import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';

export interface IOrderItem {
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
}

export interface IFoodOrder extends Document {
    guestId: mongoose.Types.ObjectId;
    roomNumber: string;
    items: IOrderItem[];
    totalAmount: number;
    status: OrderStatus;
    notes?: string;
    paymentMethod: 'Cash' | 'Online' | 'HyperPay';
    // HyperPay payment tracking
    checkoutId?: string;
    paymentStatus?: 'pending' | 'success' | 'failed';
    transactionId?: string;
    paymentResponse?: any;
    paymentCompletedAt?: Date;
    currency?: 'AED' | 'USD';
    createdAt: Date;
    updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
    {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }, // Price at time of order
    },
    { _id: false }
);

const foodOrderSchema = new Schema<IFoodOrder>(
    {
        guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
        roomNumber: { type: String, required: true },
        items: [orderItemSchema],
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
            default: 'Pending',
        },
        notes: { type: String },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Online', 'HyperPay'],
            default: 'Cash',
        },
        // HyperPay payment tracking
        checkoutId: { type: String },
        paymentStatus: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending', // Added default
        },
        transactionId: { type: String, default: null }, // Added default
        paymentResponse: { type: Schema.Types.Mixed },
        currency: {
            type: String,
            enum: ['AED', 'USD'],
            default: 'AED',
        },
        paymentCompletedAt: { type: Date, default: null }, // Added this field
    },
    { timestamps: true }
);

export const FoodOrder = mongoose.model<IFoodOrder>('FoodOrder', foodOrderSchema);
