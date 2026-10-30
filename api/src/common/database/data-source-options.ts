import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export const buildDataSourceOptions = (
  url: string,
  ssl: boolean,
): DataSourceOptions => ({
  type: 'postgres',
  url,
  ssl: ssl ? { rejectUnauthorized: true } : false,
  entities: [
    join(__dirname, '..', '..', 'modules', '**', '*.{entity,entities}.{ts,js}'),
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
});
