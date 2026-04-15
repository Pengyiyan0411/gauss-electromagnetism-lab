import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SceneEntity } from './entities/scene.entity';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';

@Module({
  imports: [TypeOrmModule.forFeature([SceneEntity])],
  controllers: [ScenesController],
  providers: [ScenesService],
})
export class ScenesModule {}