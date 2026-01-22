import express from 'express';
import {
    createServiceRequest,
    getServiceRequests,
    updateServiceRequestStatus,
} from '../controllers/serviceController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createServiceRequest)
    .get(protect, getServiceRequests); // Staff

router.route('/:id/status')
    .put(protect, updateServiceRequestStatus); // Staff

export default router;
