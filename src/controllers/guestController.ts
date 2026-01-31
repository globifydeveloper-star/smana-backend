import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Guest } from '../models/Guest.js';
import { Room } from '../models/Room.js';
import { socketService } from '../services/socketService.js';
import { registerGuestSchema } from '../validation/schemas.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new guest (Public) - For mobile app signup
// @route   POST /api/guests/register
// @access  Public
export const registerGuest = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, password } = req.body;

    // Validate
    const validation = registerGuestSchema.safeParse({ name, email, phone, password });
    if (!validation.success) {
        res.status(400);
        throw new Error(validation.error.message);
    }

    let guest = await Guest.findOne({ email });

    if (guest) {
        res.status(400);
        throw new Error('User already exists');
    }

    guest = await Guest.create({
        name,
        email,
        phone,
        password, // Pre-save hook will hash this
        isCheckedIn: false,
    });

    // Generate token
    const token = generateToken(res, (guest._id as any).toString());

    socketService.emit('guest-registered', guest);

    res.status(201).json({
        _id: guest._id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        isCheckedIn: guest.isCheckedIn,
        token
    });
});

// @desc    Register a new guest (or find existing) and check them in (Admin/Staff)
// @route   POST /api/guests/check-in
// @access  Private/Staff
export const checkInGuest = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Staff checking in a guest manually.
        // If guest exists, update them. If not, create them (password optional or default?)
        // For now keeping it simple: if creating new guest via admin, password might be empty or generated?
        // Let's assume admin check-ins might not set a password immediately, or we handle it gracefully.
        const { name, email, phone, roomNumber, checkOutDate } = req.body;
        console.log('Check-in Request:', { name, email, phone, roomNumber, checkOutDate });

        // ... (rest of checkIn logic, skipping schema check for password if strictly staff flow, or make it optional in schema for this route if needed)
        // Actually, let's reuse registerGuestSchema but make password optional for checkInGuest?
        // Or just check required fields manually.

        let guest = await Guest.findOne({ email });

        if (guest) {
            guest.name = name;
            guest.phone = phone;
            guest.roomNumber = roomNumber;
            guest.isCheckedIn = true;
            guest.checkInDate = new Date();
            guest.checkOutDate = checkOutDate ? new Date(checkOutDate) : undefined;
            await guest.save();
        } else {
            guest = await Guest.create({
                name,
                email,
                phone,
                roomNumber,
                isCheckedIn: true,
                checkInDate: new Date(),
                checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined
                // No password set here if admin creates them. That's fine, matchPassword will fail, they can reset later.
            });
        }

        // Update Room status
        const room = await Room.findOne({ roomNumber });
        if (room) {
            room.status = 'Occupied';
            room.currentGuestId = guest._id as any;
            await room.save();
            socketService.emit('room-status-changed', room);
        }

        socketService.emit('guest-checked-in', guest);
        res.status(201).json(guest);
    } catch (error: any) {
        console.error('Check-in Error Detailed:', error);
        res.status(500);
        throw new Error(error?.message || 'Check-in failed');
    }
});

// @desc    Check out guest
// @route   POST /api/guests/check-out/:id
// @access  Private/Staff
export const checkOutGuest = asyncHandler(async (req: Request, res: Response) => {
    const guest = await Guest.findById(req.params.id);

    if (guest && guest.isCheckedIn) {
        const roomNumber = guest.roomNumber;

        guest.isCheckedIn = false;
        guest.roomNumber = undefined;
        await guest.save();

        if (roomNumber) {
            const room = await Room.findOne({ roomNumber });
            if (room) {
                room.status = 'Cleaning'; // Set to cleaning after checkout
                room.currentGuestId = undefined;
                await room.save();
                socketService.emit('room-status-changed', room);
            }
        }

        socketService.emit('guest-checked-out', guest);
        res.json({ message: 'Guest checked out successfully' });
    } else {
        res.status(404);
        throw new Error('Guest not found or already checked out');
    }
});

// @desc    Get all guests
// @route   GET /api/guests
// @access  Private/Staff
export const getGuests = asyncHandler(async (req: Request, res: Response) => {
    const guests = await Guest.find({}).sort({ updatedAt: -1 });
    res.json(guests);
});

// @desc    Guest Login (via Email and Password)
// @route   POST /api/guests/login
// @access  Public
export const loginGuest = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find guest
    const guest = await Guest.findOne({ email });

    if (guest && (await guest.matchPassword(password))) {
        const token = generateToken(res, (guest._id as any).toString());
        res.json({
            _id: guest._id,
            name: guest.name,
            email: guest.email,
            roomNumber: guest.roomNumber,
            isCheckedIn: guest.isCheckedIn,
            checkInDate: guest.checkInDate,
            checkOutDate: guest.checkOutDate,
            token
            // Return other fields as needed
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});
