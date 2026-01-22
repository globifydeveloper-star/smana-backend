import express from 'express';
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoomStatus,
} from '../controllers/roomController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getRooms)
    .post(protect, admin, createRoom);

router.route('/:id')
    .get(protect, getRoomById);

router.route('/:id/status')
    .put(protect, updateRoomStatus);

export default router;
