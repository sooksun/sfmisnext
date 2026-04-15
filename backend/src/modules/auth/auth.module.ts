import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // ใช้ registerAsync เพื่อให้ secret ถูกอ่าน AFTER ConfigModule โหลด .env
    // (ถ้าใช้ register() แบบ sync จะอ่าน process.env ตอน module decoration time
    // ซึ่งเกิดก่อน .env ถูกโหลด → ได้ fallback → signing/verify ใช้ secret ต่างกัน)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback-dev-secret',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
