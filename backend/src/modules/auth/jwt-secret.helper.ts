import { ConfigService } from '@nestjs/config';

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET phai duoc cau hinh va dai it nhat 32 ky tu. Dat trong backend/.env.',
    );
  }
  return secret;
}
