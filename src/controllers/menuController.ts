import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { MenuItem } from '../models/MenuItem.js';
import { createMenuItemSchema } from '../validation/schemas.js';
import { socketService } from '../services/socketService.js';
import { uploadFromBuffer } from '../config/cloudinary.js';

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public
export const getMenu = asyncHandler(async (req: Request, res: Response) => {
    const menuItems = await MenuItem.find({ isActive: true });
    res.json(menuItems);
});

// @desc    Get all menu items (Admin)
// @route   GET /api/menu/admin
// @access  Private/Admin
export const getMenuAdmin = asyncHandler(async (req: Request, res: Response) => {
    const menuItems = await MenuItem.find({});
    res.json(menuItems);
});

// @desc    Create menu item
// @route   POST /api/menu
// @access  Private/Admin
export const createMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { name, price, category, description, allergens, imageUrl } = req.body;

    let finalImageUrl = imageUrl || '';

    if (req.file) {
        try {
            // Upload to Cloudinary using the helper
            const result = await uploadFromBuffer(req.file.buffer, { folder: 'smana-hotel-menu' });
            finalImageUrl = result.secure_url;
        } catch (error) {
            res.status(500);
            throw new Error('Image upload failed');
        }
    }

    if (isNaN(Number(price))) {
        res.status(400);
        throw new Error('Price must be a valid number');
    }

    const menuItem = await MenuItem.create({
        name,
        price: Number(price),
        category,
        description,
        allergens: allergens ? (typeof allergens === 'string' ? JSON.parse(allergens) : allergens) : [],
        imageUrl: finalImageUrl
    });

    if (menuItem) {
        socketService.emit('menu-updated', menuItem);
        res.status(201).json(menuItem);
    } else {
        res.status(400);
        throw new Error('Invalid menu data');
    }
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
        menuItem.name = req.body.name || menuItem.name;

        if (req.body.price !== undefined) {
            const price = Number(req.body.price);
            if (isNaN(price)) {
                res.status(400);
                throw new Error('Price must be a valid number');
            }
            menuItem.price = price;
        }

        menuItem.category = req.body.category || menuItem.category;
        menuItem.description = req.body.description || menuItem.description;
        menuItem.isActive = req.body.isActive !== undefined ? req.body.isActive : menuItem.isActive;

        if (req.body.allergens) {
            menuItem.allergens = typeof req.body.allergens === 'string' ? JSON.parse(req.body.allergens) : req.body.allergens;
        }

        if (req.file) {
            try {
                const result = await uploadFromBuffer(req.file.buffer, { folder: 'smana-hotel-menu' });
                menuItem.imageUrl = result.secure_url;
            } catch (error) {
                res.status(500);
                throw new Error('Image upload failed');
            }
        } else if (req.body.imageUrl) {
            menuItem.imageUrl = req.body.imageUrl;
        }

        const updatedMenuItem = await menuItem.save();
        socketService.emit('menu-updated', updatedMenuItem);
        res.json(updatedMenuItem);
    } else {
        res.status(404);
        throw new Error('Menu item not found');
    }
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
        await menuItem.deleteOne();
        socketService.emit('menu-updated', { id: req.params.id, deleted: true });
        res.json({ message: 'Menu item removed' });
    } else {
        res.status(404);
        throw new Error('Menu item not found');
    }
});
