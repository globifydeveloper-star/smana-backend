import express from 'express';
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoomStatus,
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

export default router;
