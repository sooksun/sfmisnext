import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;   // admin_id
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
      // อ่าน secret ผ่าน ConfigService → ค่าตรงกับ JwtModule.registerAsync ใน auth.module.ts
      secretOrKey: config.get<string>('JWT_SECRET') || 'fallback-dev-secret',
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
