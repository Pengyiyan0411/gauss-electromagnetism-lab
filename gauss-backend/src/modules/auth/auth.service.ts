import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户注册 (包含密码加盐哈希)
   */
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('邮箱已被注册');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash: hash,
    });
    await this.userRepo.save(user);

    return this.generateTokens(user.id, user.role);
  }

  /**
   * 用户登录验证
   */
  async login(dto: LoginDto) {
    // 强制选中 select:false 的密码字段进行比对
    const user = await this.userRepo.createQueryBuilder('user')
      .where('user.email = :email', { email: dto.email })
      .addSelect('user.passwordHash')
      .getOne();

    if (!user) throw new UnauthorizedException('凭证错误');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('凭证错误');

    return this.generateTokens(user.id, user.role);
  }

  private generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }), // 长效刷新令牌
    };
  }
}