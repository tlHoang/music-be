import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      this.logger.debug('No required roles, allowing access');
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const { user } = req;

    this.logger.debug('Required roles: ' + JSON.stringify(requiredRoles));
    this.logger.debug('Request object keys: ' + Object.keys(req));
    this.logger.debug('User object: ' + JSON.stringify(user));

    if (!user) {
      this.logger.error('User object is missing in request');
      return false;
    }

    if (!user.role) {
      this.logger.error('Role is undefined in user object');
      this.logger.debug('Full request user object: ' + JSON.stringify(user));
      return false;
    }

    const hasRole = requiredRoles.some(
      (role) => user.role && user.role.toUpperCase() === role.toUpperCase(),
    );

    this.logger.debug(`User role: ${user.role}, Has required role: ${hasRole}`);

    return hasRole;
  }
}
