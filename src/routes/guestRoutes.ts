import express from 'express';
import {
    checkInGuest,
    checkOutGuest,
    getGuests,
    loginGuest,
    registerGuest,
} from '../controllers/guestController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', loginGuest);
router.post('/register', registerGuest);

router.route('/')
    .get(protect, getGuests) // Staff to list guests
    .post(protect, checkInGuest); // Staff determines checkin

router.post('/check-out/:id', protect, checkOutGuest);

export default router;
