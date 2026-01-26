
import { registerGuestSchema } from '../src/validation/schemas.js';

const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '12345678',
    password: 'password123',
    dob: '1990-01-01',
    gender: 'Male'
};

const invalidPayload = {
    name: 'J',
    email: 'not-an-email',
    phone: '123',
    password: '123'
};

const missingOptional = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '87654321',
    password: 'password123'
};

console.log('Testing Valid Payload:', registerGuestSchema.safeParse(validPayload).success);
console.log('Testing Invalid Payload:', registerGuestSchema.safeParse(invalidPayload).success);
console.log('Testing Missing Optional Payload (Should fail now):', registerGuestSchema.safeParse(missingOptional).success === false);
