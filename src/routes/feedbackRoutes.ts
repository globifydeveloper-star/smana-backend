import express from 'express';
import { createFeedback, getFeedbacks } from '../controllers/feedbackController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createFeedback)
    .get(protect, admin, getFeedbacks); // Only admin/staff can view

export default router;
