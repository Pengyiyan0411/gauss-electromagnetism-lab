import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private userRepo: Repository<UserEntity>) {}

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (dto.nickname) user.nickname = dto.nickname;
    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(dto.password, salt);
    }
    await this.userRepo.save(user);
    // 隐藏密码返回
    const { passwordHash, ...result } = user;
    return result;
  }
}