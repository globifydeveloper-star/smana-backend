import express from 'express';
import {
    createServiceRequest,
    getServiceRequests,
    updateServiceRequestStatus,
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createServiceRequest)
    .get(protect, authorize('Admin', 'Receptionist', 'Housekeeping', 'Manager'), getServiceRequests); // Staff

router.route('/:id/status')
    .put(protect, authorize('Admin', 'Receptionist', 'Housekeeping', 'Manager'), updateServiceRequestStatus); // Staff

export default router;
