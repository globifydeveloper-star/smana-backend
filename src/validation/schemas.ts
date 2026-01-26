import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const registerGuestSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
    dob: z.string(), // Expecting ISO string or similar date format
    gender: z.string(),
    password: z.string().min(6), // Add password requirement
});

export const guestLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1), // Just ensure it's provided
});

export const createRoomSchema = z.object({
    roomNumber: z.string(),
    type: z.enum(['Standard', 'Deluxe', 'Suite', 'Royal']),
    floor: z.number(),
    status: z.enum(['Available', 'Occupied', 'Cleaning', 'Maintenance']).optional(),
});

export const createMenuItemSchema = z.object({
    name: z.string(),
    price: z.number().positive(),
    category: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    allergens: z.array(z.string()).optional(),
});

export const createOrderSchema = z.object({
    roomNumber: z.string(),
    items: z.array(z.object({
        menuItemId: z.string(),
        quantity: z.number().min(1),
    })).min(1),
    notes: z.string().optional(),
    paymentMethod: z.enum(['Cash', 'Online']).default('Cash'),
});

export const createServiceRequestSchema = z.object({
    roomNumber: z.string(),
    type: z.string(),
    priority: z.enum(['Low', 'Medium', 'High']),
    message: z.string().optional(),
});

export const createStaffSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['Admin', 'Receptionist', 'Housekeeping', 'Chef', 'Manager']),
});
