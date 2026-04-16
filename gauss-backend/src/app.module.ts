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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // --- 数据库连接模块 (TypeORM) ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 🌟 核心修复逻辑：判断当前是否在生产环境（Render）
        const dbUrl = configService.get<string>('DATABASE_URL');

        return {
          type: 'postgres',
          // 如果有 DATABASE_URL 则优先使用，否则 fallback 到独立配置
          url: dbUrl,
          host: !dbUrl ? configService.get<string>('DB_HOST', 'localhost') : undefined,
          port: !dbUrl ? configService.get<number>('DB_PORT', 5432) : undefined,
          username: !dbUrl ? configService.get<string>('DB_USERNAME', 'gauss_admin') : undefined,
          password: !dbUrl ? configService.get<string>('DB_PASSWORD', 'strong_password') : undefined,
          database: !dbUrl ? configService.get<string>('DB_DATABASE', 'gauss_db') : undefined,

          autoLoadEntities: true,
          synchronize: true, // 开发模式建议开启，生产环境需谨慎

          // 👑 解决 Render 连接拒绝的核心配置
          ssl: dbUrl ? true : false,
          extra: {
            max: 20,
            idleTimeoutMillis: 30000,
            // 🌟 必须添加这个 ssl 配置块，否则 Node.js 会因为证书不匹配拒绝连接
            ssl: dbUrl ? {
              rejectUnauthorized: false,
            } : undefined,
          },
        };
      },
    }),

    // --- 业务功能模块组装 ---
    AuthModule,
    UsersModule,
    ScenesModule,
    LearningModule,
    CollaborationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}