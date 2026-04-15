import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('experiment_scenes')
export class SceneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // 场景名称，例如 "法拉第极限转速测试"

  @Column()
  activeTopic: string; // 关联到前端知识点路由 (gauss-electric, faraday 等)

  // 🌟 核心：利用 PostgreSQL 的 JSONB 类型，直接无缝存储前端的 AppState 对象！
  @Column({ type: 'jsonb' })
  stateData: Record<string, any>;

  @Column({ default: false })
  isPublic: boolean; // 是否分享到社区

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  author: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}