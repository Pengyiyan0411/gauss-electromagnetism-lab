import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('learning_progress')
@Unique(['user', 'topic']) // 确保每个用户每个知识点只有一条进度记录
export class LearningEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column()
  topic: string; // 知识点路由，如 'gauss-electric'

  @Column({ type: 'float', default: 20.0 })
  mastery: number; // 掌握度 0 - 100

  @UpdateDateColumn()
  lastStudiedAt: Date;
}