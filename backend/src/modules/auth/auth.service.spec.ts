import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { AccountRole, AccountStatus } from './entities/account.entity';

type Repo = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function mockRepo(): Repo {
  return {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ accountId: 1, ...x })),
  };
}

describe('AuthService', () => {
  let svc: AuthService;
  let accountsRepo: Repo;
  let studentsRepo: Repo;
  let staffsRepo: Repo;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let mailService: { isConfigured: jest.Mock; sendMail: jest.Mock };

  beforeEach(() => {
    accountsRepo = mockRepo();
    studentsRepo = mockRepo();
    staffsRepo = mockRepo();
    jwtService = { sign: jest.fn(() => 'jwt-token') };
    configService = { get: jest.fn(() => 'http://app') };
    mailService = { isConfigured: jest.fn(() => true), sendMail: jest.fn(() => Promise.resolve()) };

    svc = new AuthService(
      accountsRepo as any,
      studentsRepo as any,
      staffsRepo as any,
      jwtService as any,
      configService as any,
      mailService as any,
    );
  });

  describe('register', () => {
    it('throws ConflictException neu username da ton tai', async () => {
      accountsRepo.findOne.mockResolvedValue({ accountId: 99 });
      await expect(svc.register({ username: 'x', password: 'longpass1' } as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('khong tra ve passwordHash', async () => {
      accountsRepo.findOne.mockResolvedValue(null);
      const result = await svc.register({ username: 'newuser', password: 'longpass1' } as any);
      expect(result).toEqual(expect.objectContaining({ username: 'newuser', role: AccountRole.STUDENT }));
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('luon force role = STUDENT', async () => {
      accountsRepo.findOne.mockResolvedValue(null);
      const result = await svc.register({ username: 'u', password: 'longpass1', role: AccountRole.ADMIN } as any);
      expect(result.role).toBe(AccountRole.STUDENT);
    });
  });

  describe('validateUser', () => {
    it('throws Unauthorized voi mat khau sai', async () => {
      const hash = await bcrypt.hash('correct', 10);
      accountsRepo.findOne.mockResolvedValue({ accountId: 1, passwordHash: hash, status: AccountStatus.ACTIVE });
      await expect(svc.validateUser('u', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized neu account khong active', async () => {
      const hash = await bcrypt.hash('correct', 10);
      accountsRepo.findOne.mockResolvedValue({ accountId: 1, passwordHash: hash, status: AccountStatus.LOCKED });
      await expect(svc.validateUser('u', 'correct')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns account khi pass đúng + active', async () => {
      const hash = await bcrypt.hash('correct', 10);
      accountsRepo.findOne.mockResolvedValue({ accountId: 1, passwordHash: hash, status: AccountStatus.ACTIVE });
      const r = await svc.validateUser('u', 'correct');
      expect(r.accountId).toBe(1);
    });
  });

  describe('forgotPassword', () => {
    it('tra generic message va KHONG tra resetToken khi user khong ton tai', async () => {
      accountsRepo.findOne.mockResolvedValue(null);
      const r = await svc.forgotPassword({ username: 'noone' } as any);
      expect(r).toEqual({ message: expect.any(String) });
      expect((r as any).resetToken).toBeUndefined();
    });

    it('khong gui email neu account khong co email lien ket', async () => {
      accountsRepo.findOne.mockResolvedValue({ accountId: 1, username: 'u', role: AccountRole.STUDENT });
      studentsRepo.findOne.mockResolvedValue(null);
      const r = await svc.forgotPassword({ username: 'u' } as any);
      expect(r.message).toBeDefined();
      expect(mailService.sendMail).not.toHaveBeenCalled();
      expect((r as any).resetToken).toBeUndefined();
    });

    it('gui email khi co email va luu hashed token vao account', async () => {
      const account: any = { accountId: 1, username: 'u', role: AccountRole.STUDENT };
      accountsRepo.findOne.mockResolvedValue(account);
      studentsRepo.findOne.mockResolvedValue({ emailPersonal: 'student@x.com' });

      const r = await svc.forgotPassword({ username: 'u' } as any);

      expect(r.message).toBeDefined();
      expect((r as any).resetToken).toBeUndefined();
      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      expect(account.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
      expect(account.resetPasswordExpires).toBeInstanceOf(Date);
    });
  });

  describe('resetPassword', () => {
    it('throws khi token khong khop', async () => {
      accountsRepo.findOne.mockResolvedValue(null);
      await expect(svc.resetPassword({ token: 'bad', newPassword: 'longpass1' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws khi token het han', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      accountsRepo.findOne.mockResolvedValue({
        accountId: 1,
        resetPasswordToken: hashed,
        resetPasswordExpires: new Date(Date.now() - 1000),
      });
      await expect(svc.resetPassword({ token, newPassword: 'longpass1' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('reset password thanh cong va xoa token', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      const account: any = {
        accountId: 1,
        passwordHash: 'old',
        resetPasswordToken: hashed,
        resetPasswordExpires: new Date(Date.now() + 60000),
      };
      accountsRepo.findOne.mockResolvedValue(account);

      const r = await svc.resetPassword({ token, newPassword: 'longpass1' } as any);
      expect(r.message).toBeDefined();
      expect(account.passwordHash).not.toBe('old');
      expect(account.resetPasswordToken).toBeNull();
      expect(account.resetPasswordExpires).toBeNull();
    });
  });
});
