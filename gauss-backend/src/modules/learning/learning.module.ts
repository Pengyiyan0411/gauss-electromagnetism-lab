import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningEntity } from './entities/learning.entity';
import { LearningService } from './learning.service';
// 实际开发中还需要加上 LearningController 暴露接口，这里主要展示逻辑

@Module({
  imports: [TypeOrmModule.forFeature([LearningEntity])],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}