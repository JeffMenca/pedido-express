import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

export default new DataSource(
  buildDataSourceOptions(
    process.env.DATABASE_URL ?? '',
    process.env.DATABASE_SSL === 'true',
  ),
);
