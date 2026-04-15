import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SceneEntity } from './entities/scene.entity';
import { SaveSceneDto } from './dto/scene.dto';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(SceneEntity)
    private sceneRepo: Repository<SceneEntity>,
  ) {}

  async saveState(userId: string, dto: SaveSceneDto) {
    const scene = this.sceneRepo.create({
      ...dto,
      author: { id: userId }, // 关联用户
    });
    return this.sceneRepo.save(scene);
  }

  async findPublicScenes() {
    return this.sceneRepo.find({
      where: { isPublic: true },
      relations: ['author'],
      select: { author: { nickname: true, id: true } },
      order: { createdAt: 'DESC' },
    });
  }
}