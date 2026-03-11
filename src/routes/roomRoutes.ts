import express from 'express';
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoomStatus,
    updateRoomAvailability,
    updateRoomConfig,
} from '../controllers/roomController.js';
import { protect, admin, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getRooms)
    .post(protect, admin, createRoom);

router.route('/:id')
    .get(protect, getRoomById);

router.route('/:id/status')
    // Allow Admin, Receptionist, Housekeeping, and Manager to update room status
    .put(protect, authorize('Admin', 'Receptionist', 'Housekeeping', 'Manager', 'Front Office'), updateRoomStatus);

router.route('/:id/availability')
    .put(protect, authorize('Admin', 'Receptionist', 'Housekeeping', 'Manager', 'Front Office'), updateRoomAvailability);

router.route('/:id/config')
    // Allow admins and managers to update room configuration (bedType, specialFeatures)
    .put(protect, authorize('Admin', 'Manager'), updateRoomConfig);

export default router;
