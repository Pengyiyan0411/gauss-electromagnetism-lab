import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// 引入你写的拦截器和过滤器
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. 【增强】安全防线：配置 Helmet
  app.use(helmet({
    // 必须关闭此项，否则 WebGPU 渲染和某些 3D 特性会被浏览器拦截
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 允许加载来自自己和指定域名的资源
        connectSrc: ["'self'", "https://*.onrender.com", "wss://*.onrender.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // 2. 【增强】跨域配置：增加生产环境域名
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://physics-electromagnetism-lab.onrender.com' // 你的前端 Render 域名
    ],
    credentials: true,
  });

  // 3. 注册全局数据校验管道（保持你原有的配置）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 挂载你原有的全局异常过滤器和响应拦截器
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. Swagger API 文档生成配置（保持原有）
  const config = new DocumentBuilder()
    .setTitle('高斯电磁学全栈实验平台 API')
    .setDescription('提供用户认证、物理场景云端同步、社区协作能力的接口规范')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 5. 【增强】启动端口：适配云环境
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 后端服务已启动: http://localhost:${port}/api/docs`);
}
bootstrap();