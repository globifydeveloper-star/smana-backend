import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Export multer instance (memory storage)
export const multerUpload = multer({
    storage: multer.memoryStorage(),
});

// Helper: upload a Buffer to Cloudinary using upload_stream
export async function uploadFromBuffer(
    buffer: Buffer,
    options?: { folder?: string; public_id?: string }
): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: options?.folder, public_id: options?.public_id },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Cloudinary upload failed: No result returned'));
                resolve(result as UploadApiResponse);
            }
        );

        // Create a Readable stream from the Buffer and pipe to Cloudinary
        const readable = new Readable();
        readable._read = () => { }; // noop
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
}

export default cloudinary;
