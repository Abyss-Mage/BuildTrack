import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure Multer with memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and PDF receipts are allowed.`
      ),
      false
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5, // Max 5 receipts per expense
  },
  fileFilter,
});

/**
 * Process uploaded files:
 * Compresses images with Sharp, preserves PDFs, writes to dated folders.
 */
export async function processReceiptFiles(files) {
  if (!files || files.length === 0) return [];

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const uploadBaseDir = path.resolve(__dirname, '../../uploads/receipts');
  const targetDir = path.join(uploadBaseDir, year, month);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const processed = [];

  for (const file of files) {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const isPdf = file.mimetype === 'application/pdf';
    const extension = isPdf ? 'pdf' : 'jpg';
    const filename = `${Date.now()}-${randomHex}.${extension}`;
    const destinationPath = path.join(targetDir, filename);
    const relativeUrl = `/uploads/receipts/${year}/${month}/${filename}`;

    if (isPdf) {
      // Save PDF directly
      fs.writeFileSync(destinationPath, file.buffer);
      processed.push({
        filePath: relativeUrl,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });
    } else {
      // Compress and resize image
      const optimizedBuffer = await sharp(file.buffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      fs.writeFileSync(destinationPath, optimizedBuffer);

      processed.push({
        filePath: relativeUrl,
        originalName: file.originalname,
        fileSize: optimizedBuffer.length,
        mimeType: 'image/jpeg',
      });
    }
  }

  return processed;
}
