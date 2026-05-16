import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Tin x-forwarded-for chi tu reverse proxy duoc khai bao trong TRUST_PROXY.
  // Vi du: TRUST_PROXY=1 (1 hop), TRUST_PROXY=loopback (chi local), TRUST_PROXY=10.0.0.0/8
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const value = /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy;
    app.set('trust proxy', value);
  } else {
    app.set('trust proxy', false);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, filePath) => {
      // Force download de tranh XSS qua SVG/HTML disguise
      const fileName = filePath.split(/[\\/]/).pop() ?? 'file';
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  //config swagger
  const config = new DocumentBuilder()
    .setTitle('QL KTX API')
    .setDescription('REST API quản lý ký túc xá: đăng ký nội trú, check-in/out, điện nước, hóa đơn, sửa chữa và thông báo.')
    .setVersion('1.0')
    .addTag('ktx')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token', // custom name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.LISTEN_PORT ?? 3001);
}
bootstrap();
