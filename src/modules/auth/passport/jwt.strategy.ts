import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '3600s',
    });
  }

  async validate(payload: any) {
    // Debug the incoming payload
    this.logger.debug('JWT payload received:');
    this.logger.debug(JSON.stringify(payload));

    // Include all user information, especially the role
    const user = {
      _id: payload.sub,
      email: payload.email,
      role: payload.role, // Ensure role is included
      username: payload.username,
    };

    this.logger.debug('User object created in JWT validate:');
    this.logger.debug(JSON.stringify(user));

    return user;
  }
}
