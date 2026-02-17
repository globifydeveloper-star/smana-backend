import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { Staff } from '../models/Staff.js';
import { Guest } from '../models/Guest.js';

interface DecodedToken {
    userId: string;
}

const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    token = req.cookies.jwt;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as DecodedToken;

            // Try finding in Staff first, then Guest
            let user: any = await Staff.findById(decoded.userId).select('-password');
            if (!user) {
                user = await Guest.findById(decoded.userId);
            }

            if (!user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && ((req.user as any).role === 'Admin' || (req.user as any).role === 'Manager')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user && roles.includes((req.user as any).role)) {
            next();
        } else {
            res.status(403).json({ message: `User role ${(req.user as any).role} is not authorized to access this route` });
        }
    };
};

export { protect, admin, authorize };
