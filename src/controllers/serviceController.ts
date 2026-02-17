import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { ServiceRequest } from '../models/ServiceRequest.js';
import { createServiceRequestSchema } from '../validation/schemas.js';
import { socketService } from '../services/socketService.js';
import { createNotification } from './notificationController.js';

// @desc    Create service request
// @route   POST /api/service-requests
// @access  Private
export const createServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const result = createServiceRequestSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error('Invalid data');
    }

    const { roomNumber, type, priority, message } = result.data;
    const guestId = req.user ? (req.user as any)._id : null;

    if (!guestId) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    const serviceRequest = await ServiceRequest.create({
        guestId,
        roomNumber,
        type,
        priority,
        message,
        status: 'Open'
    });

    if (serviceRequest) {
        const populatedRequest = await serviceRequest.populate('guestId', 'name');
        socketService.emit('new-service-request', populatedRequest);

        // Notify Housekeeping
        await createNotification(
            `Service Request Room ${populatedRequest.roomNumber}`,
            `${populatedRequest.type} requested (Priority: ${populatedRequest.priority})`,
            'info',
            'Housekeeping',
            undefined,
            populatedRequest._id.toString(),
            `/dashboard/requests`
        );
        // Notify Admin
        await createNotification(
            `Service Request Room ${populatedRequest.roomNumber}`,
            `${populatedRequest.type} requested (Priority: ${populatedRequest.priority})`,
            'info',
            'Admin',
            undefined,
            populatedRequest._id.toString(),
            `/dashboard/requests`
        );
        res.status(201).json(populatedRequest);
    } else {
        res.status(400);
        throw new Error('Invalid data');
    }
});

// @desc    Get all service requests
// @route   GET /api/service-requests
// @access  Private/Staff
export const getServiceRequests = asyncHandler(async (req: Request, res: Response) => {
    let query = {};

    // If not admin/staff (assuming roles), filter by guestId. 
    // Usually guests don't have 'role' or it's 'Guest'.
    // Adjust logic based on your authentication model.
    const user = req.user as any;

    console.log('Get Service Requests - User:', user ? `${user._id} (Role: ${user.role})` : 'No User');

    if (user && (!user.role || user.role === 'Guest')) {
        query = { guestId: user._id };
    }

    console.log('Get Service Requests - Query:', JSON.stringify(query));

    const requests = await ServiceRequest.find(query)
        .populate('guestId', 'name')
        .sort({ createdAt: -1 });

    console.log(`Found ${requests.length} requests`);
    res.json(requests);
});

// @desc    Update service request status
// @route   PUT /api/service-requests/:id/status
// @access  Private/Staff
export const updateServiceRequestStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (request) {
        request.status = status;
        if (req.user && (req.user as any).role) {
            request.handledBy = (req.user as any)._id; // Assign staff
        }
        const updatedRequest = await request.save();
        const populatedRequest = await updatedRequest.populate('guestId', 'name');
        socketService.emit('request-status-updated', populatedRequest);
        res.json(populatedRequest);
    } else {
        res.status(404);
        throw new Error('Request not found');
    }
});
