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

function requirePem(key: string): string {
  const value = requireEnv(key).replace(/\\n/g, '\n');
  if (!value.startsWith('-----BEGIN')) throw new Error(`... not a valid PEM key`);
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
  ACCESS_TOKEN_PRIVATE_KEY: requirePem('ACCESS_TOKEN_PRIVATE_KEY'),
  JWKS_URI: requireEnv('JWKS_URI'),
  SERVICE_NAME: requireEnv('SERVICE_NAME'),
  REFRESH_TOKEN_PRIVATE_KEY: requireEnv('REFRESH_TOKEN_PRIVATE_KEY'),
  COOKIE_DOMAIN: requireEnv('COOKIE_DOMAIN'),
};
