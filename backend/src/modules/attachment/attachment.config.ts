import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
// multer ไม่มี type declaration ในโปรเจกต์นี้ — import แบบ default (any)
import multer from 'multer';

/** โฟลเดอร์เก็บไฟล์แนบ (อยู่ใต้ root ของ backend) */
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

/** สร้างโฟลเดอร์ปลายทางตอนโหลด module ถ้ายังไม่มี */
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** mimetypes ที่อนุญาต */
export const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** นามสกุลไฟล์ที่อนุญาต (กัน mimetype ปลอม) */
export const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** ขนาดไฟล์สูงสุด 10MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface IncomingFile {
  originalname: string;
  mimetype: string;
}

/**
 * Multer options สำหรับ FileInterceptor — diskStorage + filter ชนิดไฟล์
 * ส่งแบบ inline เข้า FileInterceptor (ไม่ตั้ง global multer config)
 */
export const attachmentMulterOptions: MulterOptions = {
  storage: multer.diskStorage({
    destination: (_req: unknown, _file: unknown, cb: (e: Error | null, dest: string) => void) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req: unknown, file: IncomingFile, cb: (e: Error | null, name: string) => void) => {
      // ไม่เชื่อชื่อไฟล์เดิม — สุ่มชื่อใหม่ + คงนามสกุลเดิม
      const ext = path.extname(file.originalname || '').toLowerCase();
      const random = crypto.randomBytes(16).toString('hex');
      cb(null, `${random}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (
    _req: unknown,
    file: IncomingFile,
    cb: (e: Error | null, accept: boolean) => void,
  ) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.includes(ext)) {
      return cb(
        new BadRequestException('ชนิดไฟล์ไม่รองรับ (รองรับ PDF/JPG/PNG/WEBP/GIF)'),
        false,
      );
    }
    cb(null, true);
  },
};
