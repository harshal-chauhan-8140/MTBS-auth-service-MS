import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type { User } from '../user/userEntity.js';
import type { Repository } from 'typeorm';
import type { RefreshToken } from './refreshTokenEntity.js';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_GENERATION_ALGORITHM,
  REFRESH_TOKEN_AGE,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_GENERATION_ALGORITHM,
} from '../../constants/index.js';

export class TokenService {
  constructor(private refreshTokenRepository: Repository<RefreshToken>) {}

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.ACCESS_TOKEN_PRIVATE_KEY, {
      algorithm: ACCESS_TOKEN_GENERATION_ALGORITHM,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      issuer: config.SERVICE_NAME,
    });
  }

  async generateRefreshToken(payload: JwtPayload, user: User): Promise<string> {
    const newRefreshToken = await this.refreshTokenRepository.save({
      user: user,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_AGE),
    });

    const refreshToken = jwt.sign(payload, config.REFRESH_TOKEN_PRIVATE_KEY, {
      algorithm: REFRESH_TOKEN_GENERATION_ALGORITHM,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: config.SERVICE_NAME,
      jwtid: newRefreshToken.id.toString(),
    });

    return refreshToken;
  }

  async deleteRefreshToken(refreshTokenId: number) {
    return this.refreshTokenRepository.delete({
      id: refreshTokenId
    })
  }
}
