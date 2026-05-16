import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Default-deny: endpoint phai khai bao @Roles(...) hoac @Public()
        if (!requiredRoles || requiredRoles.length === 0) {
            const handler = `${context.getClass().name}.${context.getHandler().name}`;
            this.logger.warn(`RolesGuard: ${handler} thieu @Roles hoac @Public, tu choi truy cap.`);
            throw new ForbiddenException('Endpoint chua khai bao quyen truy cap.');
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException('Bạn không có quyền truy cập chức năng này.');
        }

        return true;
    }
}
