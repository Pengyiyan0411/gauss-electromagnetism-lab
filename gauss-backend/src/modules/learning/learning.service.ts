import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningEntity } from './entities/learning.entity';

@Injectable()
export class LearningService {
  constructor(@InjectRepository(LearningEntity) private repo: Repository<LearningEntity>) {}

  // 更新或插入学习进度
  async syncMastery(userId: string, topic: string, mastery: number) {
    let record = await this.repo.findOne({ where: { user: { id: userId }, topic } });
    if (!record) {
      record = this.repo.create({ user: { id: userId }, topic, mastery });
    } else {
      record.mastery = mastery;
    }
    return this.repo.save(record);
  }

  // 获取用户所有进度
  async getUserProgress(userId: string) {
    return this.repo.find({ where: { user: { id: userId } } });
  }
}