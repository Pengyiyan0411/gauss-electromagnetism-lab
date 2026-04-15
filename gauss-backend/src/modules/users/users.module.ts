import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController], // 🌟 核心修复：把控制器装载进来
  providers: [UsersService],      // 🌟 核心修复：把服务装载进来
  exports: [TypeOrmModule, UsersService], // 顺便把 Service 导出去以防万一
})
export class UsersModule {}