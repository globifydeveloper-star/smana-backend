import express from 'express';
import {
    getMenu,
    getMenuAdmin,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
} from '../controllers/menuController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { multerUpload } from '../config/cloudinary.js';

const router = express.Router();

router.route('/')
    .get(getMenu) // Public
    .post(protect, admin, multerUpload.single('image'), createMenuItem);

router.get('/admin', protect, admin, getMenuAdmin);

router.route('/:id')
    .put(protect, admin, multerUpload.single('image'), updateMenuItem)
    .delete(protect, admin, deleteMenuItem);

export default router;
