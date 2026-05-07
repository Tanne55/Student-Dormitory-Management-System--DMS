// auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '516b508ace08b91b46ed9b88b9ef0361', // make sure this matches your jwtService config
    });
  }

  async validate(payload: any) {
    const accountId = Number(payload.sub);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      throw new UnauthorizedException();
    }
    return { accountId, username: payload.username ?? '', role: payload.role ?? 'student' };
  }
}
