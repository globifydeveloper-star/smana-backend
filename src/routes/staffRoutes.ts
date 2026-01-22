import express from 'express';
import { createStaff, getAllStaff } from '../controllers/staffController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getAllStaff)
    .post(protect, createStaff);

export default router;
