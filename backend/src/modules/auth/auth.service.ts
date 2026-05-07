import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository, Not, IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Account, AccountRole, AccountStatus } from './entities/account.entity';
import { RegisterAccountDto } from './dto/requests/register-account.dto';
import { LoginDto } from './dto/requests/login.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Account) private accountsRepo: Repository<Account>,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterAccountDto): Promise<Account> {
    const existing = await this.accountsRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newAccount = this.accountsRepo.create({
      username: dto.username,
      passwordHash: hashedPassword,
      role: dto.role || AccountRole.STUDENT,
      status: AccountStatus.ACTIVE,
    });

    return this.accountsRepo.save(newAccount);
  }

  async validateUser(username: string, pass: string): Promise<Account> {
    if (!username || !pass) throw new UnauthorizedException('Invalid credentials');

    const account = await this.accountsRepo.findOne({ where: { username } });
    if (account && (await bcrypt.compare(pass, account.passwordHash))) {
      if (account.status !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }
      return account;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(dto: LoginDto) {
    const account = await this.validateUser(dto.username, dto.password);
    const payload = { sub: account.accountId, username: account.username, role: account.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; resetToken?: string }> {
    const account = await this.accountsRepo.findOne({ where: { username: dto.username } });
    if (!account) {
      // Return success even if user not found to prevent username enumeration
      return { message: 'Nếu tài khoản tồn tại, email khôi phục đã được gửi.' };
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash before saving to DB
    const hashedToken = await bcrypt.hash(resetToken, 10);

    account.resetPasswordToken = hashedToken;
    account.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.accountsRepo.save(account);

    // In a real application, send this token via email.
    // Here we return it for testing purposes.
    return {
      message: 'Token khôi phục đã được tạo thành công!',
      resetToken
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Find all users with a reset token (in practice, we'd query carefully since we only have the token)
    // Actually, normally the frontend sends user ID or username along with the token, 
    // or we query all users that have a token set. For simplicity in this structure where token is the only input:
    const accountsWithToken = await this.accountsRepo.find({
      where: { resetPasswordToken: Not(IsNull()) }
    });

    let foundAccount: Account | null = null;

    for (const account of accountsWithToken) {
      if (account.resetPasswordToken && await bcrypt.compare(dto.token, account.resetPasswordToken)) {
        foundAccount = account;
        break;
      }
    }

    if (!foundAccount) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    if (foundAccount.resetPasswordExpires && foundAccount.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    foundAccount.passwordHash = hashedPassword;
    foundAccount.resetPasswordToken = null as unknown as string;
    foundAccount.resetPasswordExpires = null as unknown as Date;

    await this.accountsRepo.save(foundAccount);

    return { message: 'Mật khẩu đã được thay đổi thành công!' };
  }
}
