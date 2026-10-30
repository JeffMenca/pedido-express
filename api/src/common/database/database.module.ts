import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './data-source-options';

export const DatabaseModule = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...buildDataSourceOptions(
      config.getOrThrow<string>('DATABASE_URL'),
      config.get<boolean>('DATABASE_SSL') ?? false,
    ),
    autoLoadEntities: true,
  }),
});
