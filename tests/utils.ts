import * as jwksModule from 'mock-jwks';
import type { JWKSMock } from 'mock-jwks';

type CreateJWKMock = (host: string, path?: string) => JWKSMock;

const jwksExport = jwksModule as unknown as {
  default: CreateJWKMock | { default: CreateJWKMock };
};

// mock-jwks ships CJS; under ESM the default lands one level deeper depending on the loader
export const createJWKMock: CreateJWKMock =
  typeof jwksExport.default === 'function' ? jwksExport.default : jwksExport.default.default;

export const JWKS_HOST = 'http://localhost:5501';

interface CookieHeaders {
  ['set-cookie']: string[];
}

export const extractTokens = (headers: unknown) => {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  const cookies = (headers as CookieHeaders)['set-cookie'] || [];

  cookies.forEach((cookie) => {
    if (cookie.startsWith('accessToken=')) {
      accessToken = cookie.split(';')[0].split('=')[1];
    }
    if (cookie.startsWith('refreshToken=')) {
      refreshToken = cookie.split(';')[0].split('=')[1];
    }
  });

  return { accessToken, refreshToken };
};

export const isJwt = (token: string | null): boolean => {
  if (token === null) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    parts.forEach((part) => {
      Buffer.from(part, 'base64').toString('utf-8');
    });
    return true;
  } catch {
    return false;
  }
};

export const userData = {
  name: 'harshal chauhan',
  email: 'harshal@gmail.com',
  password: 'Secret@123',
};
