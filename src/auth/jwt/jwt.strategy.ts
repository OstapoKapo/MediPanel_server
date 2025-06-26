import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
const sercet = process.env.JWT_SECRET;


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req.cookies?.token,
      ]),
      secretOrKey: sercet || 'TcAmns0nPzVuT3rGCbmvrlWl8V0U',
    });
  }

  async validate(payload: any) {
    console.log('JWT payload:', payload);
    return { id: payload.sub, email: payload.email, role: payload.role };
}
}
