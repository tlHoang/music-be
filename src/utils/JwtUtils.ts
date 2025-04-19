import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtUtils {
  constructor(private readonly jwtService: JwtService) {}

  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
}
