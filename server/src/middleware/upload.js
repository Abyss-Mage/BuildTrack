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

export const excelUpload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.xlsx')) cb(null, true);
    else cb(ApiError.badRequest('Upload an Excel .xlsx file. Older .xls files must be saved as .xlsx first.'), false);
  },
});

/**
 * Process uploaded files:
 * Compresses images with Sharp, preserves PDFs, writes to dated folders.
 * The browser's file type is only a claim, so the real content is checked first.
 */
export async function processReceiptFiles(files) {
  if (!files || files.length === 0) return [];

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const uploadBaseDir = path.resolve(__dirname, '../../uploads/receipts');
  const targetDir = path.join(uploadBaseDir, year, month);

  const processed = [];
  const writes = [];

  for (const file of files) {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const isPdf = file.mimetype === 'application/pdf';
    const extension = isPdf ? 'pdf' : 'jpg';
    const filename = `${Date.now()}-${randomHex}.${extension}`;
    const destinationPath = path.join(targetDir, filename);
    const relativeUrl = `/uploads/receipts/${year}/${month}/${filename}`;

    if (isPdf) {
      if (file.buffer.subarray(0, 5).toString() !== '%PDF-') {
        throw ApiError.badRequest(`${file.originalname} is not a valid PDF file.`);
      }

      // Save PDF directly
      writes.push([destinationPath, file.buffer]);
      processed.push({
        filePath: relativeUrl,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });
    } else {
      const { format } = await sharp(file.buffer).metadata().catch(() => ({}));
      if (!['jpeg', 'png', 'webp'].includes(format)) {
        throw ApiError.badRequest(`${file.originalname} is not a valid JPEG, PNG or WEBP image.`);
      }

      // Compress and resize image
      const optimizedBuffer = await sharp(file.buffer)
        .rotate() // Auto-orient based on EXIF
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      writes.push([destinationPath, optimizedBuffer]);

      processed.push({
        filePath: relativeUrl,
        originalName: file.originalname,
        fileSize: optimizedBuffer.length,
        mimeType: 'image/jpeg',
      });
    }
  }

  // Written only after every file passed, so one bad file leaves nothing behind
  fs.mkdirSync(targetDir, { recursive: true });
  for (const [destination, buffer] of writes) {
    fs.writeFileSync(destination, buffer);
  }

  return processed;
}

/** Best-effort delete of stored receipts by their /uploads/... path. */
export function removeReceiptFiles(filePaths) {
  for (const filePath of filePaths) {
    fs.rm(path.resolve(__dirname, '../..', `.${filePath}`), { force: true }, () => {});
  }
}
