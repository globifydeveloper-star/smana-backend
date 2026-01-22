import { IGuest } from '../models/Guest.js';
import { IStaff } from '../models/Staff.js';

declare global {
    namespace Express {
        interface Request {
            user?: IGuest | IStaff;
            staff?: IStaff;
        }
    }
}
