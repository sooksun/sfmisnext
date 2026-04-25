import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from './jwt-secret';

export interface JwtPayload {
  sub: number; // admin_id
  username: string;
  sc_id: number;
  type: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ใช้ helper เดียวกับ auth.module.ts → กัน drift
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) throw new UnauthorizedException('Token ไม่ถูกต้อง');
    // ค่าที่ return จะถูกใส่ใน req.user โดย Passport
    return {
      admin_id: payload.sub,
      username: payload.username,
      sc_id: payload.sc_id,
      type: payload.type,
    };
  }
}
