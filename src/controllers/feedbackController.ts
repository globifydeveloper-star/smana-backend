import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Feedback } from '../models/Feedback.js';
import { socketService } from '../services/socketService.js';
import { createNotification } from './notificationController.js';

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

    // Emit real-time socket event for open admin tabs
    socketService.emit('new-feedback', feedback);

    // Notify Admin + Manager via socket notification AND Web Push
    await createNotification(
        `New Feedback — Room ${roomNumber}`,
        `${user.name} left a ${rating}★ review: "${description.slice(0, 60)}…"`,
        rating >= 4 ? 'success' : rating >= 3 ? 'info' : 'warning',
        'Receptionist', // Re-routing generic alerts to lower-level staff; Admins/Managers will catch all globally.
        undefined,
        (feedback._id as any).toString(),
        `/dashboard/feedback`,
        {
            title: `⭐ New Guest Feedback`,
            body: `Room ${roomNumber} · ${rating}/5 stars`,
            url: '/dashboard/feedback',
            tag: 'new-feedback',
        }
    );

    res.status(201).json(feedback);
});

// @desc    Get all feedbacks
// @route   GET /api/feedbacks
// @access  Private (Staff/Admin)
export const getFeedbacks = asyncHandler(async (req: Request, res: Response) => {
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
