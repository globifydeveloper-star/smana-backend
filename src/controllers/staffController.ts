import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Staff } from '../models/Staff.js';
import { createStaffSchema } from '../validation/schemas.js';

// @desc    Create a new staff member
// @route   POST /api/staff
// @access  Private/Admin
export const createStaff = asyncHandler(async (req: Request, res: Response) => {
    const result = createStaffSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error('Invalid input: ' + result.error.message);
    }

    const { name, email, password, role } = result.data;

    const staffExists = await Staff.findOne({ email });

    if (staffExists) {
        res.status(400);
        throw new Error('Staff already exists');
    }

    const staff = await Staff.create({
        name,
        email,
        password,
        role,
    });

    if (staff) {
        res.status(201).json({
            _id: staff._id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
            isOnline: staff.isOnline,
        });
    } else {
        res.status(400);
        throw new Error('Invalid staff data');
    }
});

// @desc    Get all staff members
// @route   GET /api/staff
// @access  Private/Admin
export const getAllStaff = asyncHandler(async (req: Request, res: Response) => {
    const staff = await Staff.find({}).select('-password');
    res.json(staff);
});
