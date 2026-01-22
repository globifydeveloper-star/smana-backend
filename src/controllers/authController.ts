import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Staff } from '../models/Staff.js';
import generateToken from '../utils/generateToken.js';
import { loginSchema } from '../validation/schemas.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginStaff = asyncHandler(async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error('Invalid input');
    }

    const { email, password } = result.data;

    const staff = await Staff.findOne({ email });

    if (staff && (await staff.matchPassword(password))) {
        generateToken(res, (staff._id as any).toString());
        staff.isOnline = true;
        await staff.save();

        res.json({
            _id: staff._id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutStaff = asyncHandler(async (req: Request, res: Response) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });

    if (req.user && 'isOnline' in req.user) {
        // Set offline if needed
        // const staff = await Staff.findById(req.user._id);
        // if(staff) { staff.isOnline = false; await staff.save(); }
    }

    res.status(200).json({ message: 'Logged out successfully' });
});
