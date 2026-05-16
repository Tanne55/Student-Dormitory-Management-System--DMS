import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import { fromFile as fileTypeFromFile } from 'file-type';

/**
 * Bo extension theo whitelist va chuan hoa filename.
 * Tra ve { safeBase, safeExt } - dung cho dat ten file luu disk.
 */
export function buildSafeFilename(originalName: string, allowedExts: string[]): {
  safeBase: string;
  safeExt: string;
} {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (!allowedExts.includes(ext)) {
    throw new BadRequestException(
      `Phan mo rong khong duoc phep. Chap nhan: ${allowedExts.join(', ')}`,
    );
  }
  const sanitized = sanitize(path.basename(originalName, ext)).slice(0, 50) || 'file';
  const random = crypto.randomUUID();
  return { safeBase: `${sanitized}-${random}`, safeExt: ext };
}

/**
 * Verify magic bytes thuc te cua file tren disk (chong file gia mao MIME).
 * Neu khong khop allowedMimes -> xoa file va throw.
 */
export async function assertFileMagic(filePath: string, allowedMimes: string[]): Promise<void> {
  const detected = await fileTypeFromFile(filePath);
  if (!detected || !allowedMimes.includes(detected.mime)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    throw new BadRequestException(
      `File khong phai dinh dang hop le. Phat hien: ${detected?.mime ?? 'unknown'}.`,
    );
  }
}
