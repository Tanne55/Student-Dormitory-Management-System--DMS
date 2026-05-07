import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
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

  app.enableCors({
    origin: 'http://localhost:3000', // your Next.js port
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'], // ✅ important!

  });

  await app.listen(process.env.LISTEN_PORT ?? 3001);
}
bootstrap();
