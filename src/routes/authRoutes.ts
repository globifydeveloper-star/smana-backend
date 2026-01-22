import express from 'express';
import { loginStaff, logoutStaff } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', loginStaff);
router.post('/logout', protect, logoutStaff);

export default router;
