import mongoose, { Document, Schema } from 'mongoose';

export type ServiceStatus = 'Open' | 'In Progress' | 'Resolved' | 'Cancelled';
export type ServicePriority = 'Normal' | 'Medium' | 'High';

export interface IServiceRequest extends Document {
    guestId: mongoose.Types.ObjectId;
    roomNumber: string;
    type: string; // e.g., 'Housekeeping', 'Concierge', 'Maintenance'
    message?: string;
    priority: ServicePriority;
    status: ServiceStatus;
    handledBy?: mongoose.Types.ObjectId; // Staff ID
    createdAt: Date;
    updatedAt: Date;
}

const serviceRequestSchema = new Schema<IServiceRequest>(
    {
        guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
        roomNumber: { type: String, required: true },
        type: { type: String, required: true },
        message: { type: String },
        priority: {
            type: String,
            enum: ['Normal', 'Medium', 'High'],
            default: 'Normal',
        },
        status: {
            type: String,
            enum: ['Open', 'In Progress', 'Resolved', 'Cancelled'],
            default: 'Open',
        },
        handledBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    },
    { timestamps: true }
);

export const ServiceRequest = mongoose.model<IServiceRequest>('ServiceRequest', serviceRequestSchema);
