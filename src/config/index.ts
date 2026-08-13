import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.join(__dirname, `../../.env.${process.env.NODE_ENV}`),
});

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  PORT: requireEnv('PORT'),
  NODE_ENV: requireEnv('NODE_ENV'),
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: requireEnv('DB_PORT'),
  DB_USERNAME: requireEnv('DB_USERNAME'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DB_NAME: requireEnv('DB_NAME'),
};
