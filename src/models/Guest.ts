import mongoose, { Document, Schema } from 'mongoose';

export interface IGuest extends Document {
    name: string;
    email: string;
    password?: string; // Optional because pre-existing guests might not have one (or make required for new)
    phone: { type: String, required: true },
    dob?: Date;
    gender?: string;
    roomNumber?: string;
    isCheckedIn: boolean;
    checkInDate?: Date;
    checkOutDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

const guestSchema = new Schema<IGuest>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String }, // Store hashed
        phone: { type: String, required: true },
        dob: { type: Date },
        gender: { type: String },
        roomNumber: { type: String }, // Can be null if not yet assigned or booked
        isCheckedIn: { type: Boolean, default: false },
        checkInDate: { type: Date },
        checkOutDate: { type: Date },
    },
    { timestamps: true }
);

import bcrypt from 'bcryptjs';

guestSchema.methods.matchPassword = async function (enteredPassword: string) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

guestSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


export const Guest = mongoose.model<IGuest>('Guest', guestSchema);
