import { Request, Response } from 'express';

export const uploadFile = (req: Request, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const protocol = req.protocol;
    const host = req.get('host');
    // Construct the public URL
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(201).json({
        message: 'File uploaded successfully',
        url: fileUrl,
        filename: req.file.filename
    });
};
