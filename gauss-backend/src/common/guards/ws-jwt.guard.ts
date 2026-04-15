import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake.auth.token || client.handshake.headers['authorization']?.split(' ')[1];

      if (!token) throw new UnauthorizedException('Missing token');

      // 🌟 核心修复：去掉了硬编码的 Secret，让 JwtService 自动使用刚才 registerAsync 里的配置
      const payload = this.jwtService.verify(token);
      client.user = { userId: payload.sub, role: payload.role };
      return true;
    } catch (err) {
      throw new WsException('WebSocket Authentication failed');
    }
  }
}