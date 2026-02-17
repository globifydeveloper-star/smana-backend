import express from 'express';
import {
    getMenu,
    getMenuAdmin,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
} from '../controllers/menuController.js';
import { protect, admin, authorize } from '../middlewares/authMiddleware.js';
import { multerUpload } from '../config/cloudinary.js';

const router = express.Router();

router.route('/')
    .get(getMenu) // Public
    .post(protect, authorize('Admin', 'Chef', 'Manager'), multerUpload.single('image'), createMenuItem);

router.get('/admin', protect, authorize('Admin', 'Chef', 'Manager'), getMenuAdmin);

router.route('/:id')
    .put(protect, authorize('Admin', 'Chef', 'Manager'), multerUpload.single('image'), updateMenuItem)
    .delete(protect, authorize('Admin', 'Chef', 'Manager'), deleteMenuItem);

export default router;
