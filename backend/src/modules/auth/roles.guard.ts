import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<number[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // ไม่มี @Roles() → อนุญาตทุก role (เฉพาะ JWT valid เท่านั้น)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.type) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง');
    }

    // Super Admin (type=1) ทำงานแทนทุกตำแหน่งได้
    if (user.type === 1) return true;

    if (!requiredRoles.includes(user.type)) {
      throw new ForbiddenException('สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้');
    }

    return true;
  }
}
