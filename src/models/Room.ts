import mongoose, { Document, Schema } from 'mongoose';

export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Royal';

export interface IRoom extends Document {
    roomNumber: string;
    type: RoomType;
    status: RoomStatus;
    floor: number;
    currentGuestId?: mongoose.Types.ObjectId;
}

const roomSchema = new Schema<IRoom>(
    {
        roomNumber: { type: String, required: true, unique: true },
        type: {
            type: String,
            enum: ['Standard', 'Deluxe', 'Suite', 'Royal'],
            default: 'Standard',
        },
        status: {
            type: String,
            enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance'],
            default: 'Available',
        },
        floor: { type: Number, required: true },
        currentGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    },
    { timestamps: true }
);

export const Room = mongoose.model<IRoom>('Room', roomSchema);
