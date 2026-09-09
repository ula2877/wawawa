import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module.js';
import { laravelValidationPipe } from './common/laravel-validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(laravelValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();