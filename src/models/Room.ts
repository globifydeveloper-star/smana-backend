import mongoose, { Document, Schema } from 'mongoose';

export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Unavailable';
export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Royal';
export type BedType = 'Twin Bed 90x200' | 'Queen Bed 160x200' | 'King Bed 180x200' | 'King Bed' | 'Twin Bed' | 'Queen Bed' | 'Suite';
export type SpecialFeature = 'Bath Tub' | 'Handicap' | 'Not Required';

export interface IRoom extends Document {
    roomNumber: string;
    type: RoomType;
    status: RoomStatus;
    floor: number;
    bedType?: BedType;
    specialFeatures?: SpecialFeature[];
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
            enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Unavailable'],
            default: 'Available',
        },
        floor: { type: Number, required: true },
        bedType: {
            type: String,
            enum: ['Twin Bed 90x200', 'Queen Bed 160x200', 'King Bed 180x200', 'King Bed', 'Twin Bed', 'Queen Bed', 'Suite'],
        },
        specialFeatures: {
            type: [String],
            enum: ['Bath Tub', 'Handicap', 'Not Required'],
            default: [],
        },
        currentGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    },
    { timestamps: true }
);

export const Room = mongoose.model<IRoom>('Room', roomSchema);
