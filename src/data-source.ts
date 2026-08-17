import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './modules/user/userEntity.js';
import { config } from './config/index.js';
import { RefreshToken } from './modules/token/refreshTokenEntity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.DB_HOST,
  port: Number(config.DB_PORT),
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [User, RefreshToken],
  migrations: [],
  subscribers: [],
});
