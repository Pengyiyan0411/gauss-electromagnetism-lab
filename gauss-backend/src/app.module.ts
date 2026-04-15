import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 1. 导入基础与认证模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

// 2. 导入物理实验核心业务模块
import { ScenesModule } from './modules/scenes/scenes.module';
import { LearningModule } from './modules/learning/learning.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';

@Module({
  imports: [
    // --- 全局配置模块 ---
    // 加载 .env 文件中的环境变量，供全局使用
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // --- 数据库连接模块 (TypeORM) ---
    // 采用异步配置方式，从环境变量中安全读取数据库凭证
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'gauss_admin'),
        password: configService.get<string>('DB_PASSWORD', 'strong_password'),
        database: configService.get<string>('DB_DATABASE', 'gauss_db'),
        // 自动加载实体文件 (entities)
        autoLoadEntities: true,
        // 🌟 开发模式开启自动同步表结构；生产环境建议关闭并使用 Migrations
        synchronize: true,
        // 提高并发性能的连接池配置
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    // --- 业务功能模块组装 ---

    // 认证与用户管理
    AuthModule,
    UsersModule,

    // 物理场景云端同步 (与前端 AppState 对接)
    ScenesModule,

    // 自适应学习进度与答题记录 (保存你的 100% 奖杯状态)
    LearningModule,

    // 多人实时协作 (基于 WebSocket 的物理状态广播)
    CollaborationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}