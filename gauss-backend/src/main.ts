import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// 引入刚刚写的拦截器和过滤器
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. 安全防线：启用 Helmet 防御常见 Web 漏洞
  app.use(helmet());

  // 2. 跨域配置：允许前端 5173 端口访问
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // 3. 注册全局数据校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ==========================================
  // 🌟 核心修改点：挂载全局异常过滤器和响应拦截器
  // ==========================================
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. Swagger API 文档生成配置
  const config = new DocumentBuilder()
    .setTitle('高斯电磁学全栈实验平台 API')
    .setDescription('提供用户认证、物理场景云端同步、社区协作能力的接口规范')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 5. 启动端口
  await app.listen(3000);
  console.log(`🚀 后端服务已启动: http://localhost:3000/api/docs`);
}
bootstrap();