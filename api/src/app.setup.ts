import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { ErrorResponseDto } from './common/errors/error-response.dto';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin:
      config.get<string>('CORS_ORIGINS') === '*'
        ? true
        : config.get<string>('CORS_ORIGINS')?.split(','),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Pedido Express API')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
    { extraModels: [ErrorResponseDto] },
  );
  SwaggerModule.setup('api/docs', app, document);
}
