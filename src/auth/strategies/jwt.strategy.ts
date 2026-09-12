import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayLoad } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configServices: ConfigService) {
    super({
      secretOrKey: configServices.get('JWT_ACCESS_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(payload: JwtPayLoad) {
    return { userId: payload.sub, email: payload.email };
  }
}
