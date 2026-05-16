import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Account, AccountRole, AccountStatus } from './entities/account.entity';
import { Student } from '../students/entities/student.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/requests/login.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Account) private accountsRepo: Repository<Account>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Staff) private staffsRepo: Repository<Staff>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) { }

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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericMessage = 'Nếu tài khoản tồn tại, email khôi phục đã được gửi.';

    const account = await this.accountsRepo.findOne({ where: { username: dto.username } });
    if (!account) {
      return { message: genericMessage };
    }

    const email = await this.getEmailForAccount(account.accountId, account.role);
    if (!email) {
      this.logger.warn(`forgotPassword: account ${account.accountId} chua co email lien ket`);
      return { message: genericMessage };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    account.resetPasswordToken = hashedToken;
    account.resetPasswordExpires = new Date(Date.now() + 3600000);
    await this.accountsRepo.save(account);

    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetLink = `${appUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

    try {
      if (this.mailService.isConfigured()) {
        await this.mailService.sendMail({
          to: email,
          subject: 'Khôi phục mật khẩu - QLKTX',
          text: `Bạn vừa yêu cầu khôi phục mật khẩu. Truy cập đường dẫn sau để đặt lại (hết hạn sau 1 giờ):\n\n${resetLink}\n\nNếu không phải bạn, vui lòng bỏ qua email này.`,
          html: `
            <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản <b>${account.username}</b>.</p>
            <p>Nhấn vào liên kết dưới đây để đặt lại (hết hạn sau 1 giờ):</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
          `,
        });
      } else {
        this.logger.warn(`MailService chua cau hinh; reset link cho ${account.username}: ${resetLink}`);
      }
    } catch (err) {
      this.logger.error(`Khong gui duoc email reset cho ${account.username}`, err as Error);
    }

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');
    const foundAccount = await this.accountsRepo.findOne({
      where: { resetPasswordToken: hashedToken },
    });

    if (!foundAccount) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    if (foundAccount.resetPasswordExpires && foundAccount.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    foundAccount.passwordHash = hashedPassword;
    foundAccount.resetPasswordToken = null as unknown as string;
    foundAccount.resetPasswordExpires = null as unknown as Date;

    await this.accountsRepo.save(foundAccount);

    return { message: 'Mật khẩu đã được thay đổi thành công!' };
  }

  private async getEmailForAccount(accountId: number, role: AccountRole): Promise<string | null> {
    if (role === AccountRole.STUDENT) {
      const student = await this.studentsRepo.findOne({ where: { accountId } });
      return student?.emailSchool?.trim() || student?.emailPersonal?.trim() || null;
    }
    const staff = await this.staffsRepo.findOne({ where: { accountId } });
    return staff?.email?.trim() || null;
  }
}
