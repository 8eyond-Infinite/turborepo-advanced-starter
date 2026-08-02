import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedPrincipal } from '@repo/contracts';
import type { JwtPayload } from '@shared/application/auth/jwt-payload';
import { AccessTokenValidator } from '../../application/services/access-token-validator.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accessTokenValidator: AccessTokenValidator,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedPrincipal> {
    const principal = await this.accessTokenValidator.validate(payload);
    if (!principal) {
      throw new UnauthorizedException('Access token has been revoked');
    }
    return principal;
  }
}
