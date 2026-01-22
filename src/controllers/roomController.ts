import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Room } from '../models/Room.js';
import { createRoomSchema } from '../validation/schemas.js';
import { socketService } from '../services/socketService.js';

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
export const getRooms = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50; // Higher limit for rooms as they are often displayed in a grid
    const skip = (page - 1) * limit;

    const count = await Room.countDocuments({});
    const rooms = await Room.find({})
        .sort({ roomNumber: 1 })
        .limit(limit)
        .skip(skip);

    res.json({
        rooms,
        page,
        pages: Math.ceil(count / limit),
        total: count
    });
});

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Private
export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
    const room = await Room.findById(req.params.id);
    if (room) {
        res.json(room);
    } else {
        res.status(404);
        throw new Error('Room not found');
    }
});

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Admin
export const createRoom = asyncHandler(async (req: Request, res: Response) => {
    const result = createRoomSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error('Invalid room data');
    }

    const { roomNumber, type, floor, status } = result.data;
    const roomExists = await Room.findOne({ roomNumber });

    if (roomExists) {
        res.status(400);
        throw new Error('Room already exists');
    }

    const room = await Room.create({
        roomNumber,
        type,
        floor,
        status: status || 'Available',
    });

    if (room) {
        socketService.emit('room-status-changed', room);
        res.status(201).json(room);
    } else {
        res.status(400);
        throw new Error('Invalid room data');
    }
});

// @desc    Update room status
// @route   PUT /api/rooms/:id/status
// @access  Private/Staff
export const updateRoomStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const room = await Room.findById(req.params.id);

    if (room) {
        room.status = status;
        const updatedRoom = await room.save();
        socketService.emit('room-status-changed', updatedRoom);
        res.json(updatedRoom);
    } else {
        res.status(404);
        throw new Error('Room not found');
    }
});
