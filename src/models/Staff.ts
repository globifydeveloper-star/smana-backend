import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IStaff extends Document {
    name: string;
    email: string;
    password?: string;
    role: string; // 'Admin', 'Receptionist', 'Housekeeping', 'Chef', 'IT', 'Front Office', 'Maintenance'
    isOnline: boolean;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

const staffSchema = new Schema<IStaff>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, default: 'Admin' },
        isOnline: { type: Boolean, default: false },
    },
    { timestamps: true }
);

staffSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password || '', salt);
});

staffSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password || '');
};

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
