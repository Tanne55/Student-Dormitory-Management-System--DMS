import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
const PASSWORD_MESSAGE =
  'Mat khau >= 10 ky tu, co it nhat 1 chu hoa, 1 chu thuong va 1 chu so.';

/**
 * Yeu cau toi thieu cho mat khau nguoi dung tu nhap.
 * Khong ap dung cho mat khau he thong tu sinh (random crypto-strong).
 */
export function IsStrongPassword() {
  return applyDecorators(
    MinLength(10, { message: PASSWORD_MESSAGE }),
    Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE }),
  );
}
