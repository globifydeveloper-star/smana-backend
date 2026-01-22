import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Feedback } from '../models/Feedback.js';

// @desc    Submit feedback
// @route   POST /api/feedbacks
// @access  Private (Guest)
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
    const { rating, description, name, email, phone } = req.body;
    const user = req.user as any;

    if (!rating || !description) {
        res.status(400);
        throw new Error('Please provide a rating and description');
    }

    // Auto-fill from authenticated user if not provided, but allow overrides/manual entry if needed?
    // User requested autofill, which usually means frontend sends it or backend infers it.
    // We will trust the body first (editable fields), fallback to user profile.

    // Security: Ensure roomNumber comes from the authenticated user
    const roomNumber = user.roomNumber;
    if (!roomNumber) {
        res.status(400);
        throw new Error('Guest must be checked into a room to submit feedback.');
    }

    const feedback = await Feedback.create({
        guestId: user._id,
        roomNumber,
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        rating,
        description,
    });

    res.status(201).json(feedback);
});

// @desc    Get all feedbacks
// @route   GET /api/feedbacks
// @access  Private (Staff/Admin)
export const getFeedbacks = asyncHandler(async (req: Request, res: Response) => {
    // Pagination defaults
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const count = await Feedback.countDocuments({});
    const feedbacks = await Feedback.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    res.json({
        feedbacks,
        page,
        pages: Math.ceil(count / limit),
        total: count
    });
});
