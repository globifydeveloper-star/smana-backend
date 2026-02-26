import jwt from 'jsonwebtoken';
import { Response } from 'express';

const generateToken = (res: Response, userId: string) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET || '', {
        expiresIn: '30d',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('jwt', token, {
        httpOnly: true,
        // In production: secure + sameSite=none allows the cookie to be sent in
        // cross-origin requests (e.g. admin.smanahotels.com → api.smanahotels.com).
        // SameSite=none REQUIRES secure=true (HTTPS).
        // In development: secure=false + sameSite=lax works fine on localhost.
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — persistent across PWA relaunch
    });

    return token;
};

export default generateToken;
