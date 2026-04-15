import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 🌟 引入 Config

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // 🌟 核心修复：注入 ConfigService 拿最新的秘钥
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback_super_secret_key_gauss'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, role: payload.role };
  }
}