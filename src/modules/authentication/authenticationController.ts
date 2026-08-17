import { validationResult } from 'express-validator';
import type { UserService } from '../user/userService.js';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import type { TokenService } from '../token/tokenService.js';
import { REFRESH_TOKEN_AGE, ACCESS_TOKEN_AGE } from '../../constants/index.js';
import { config } from '../../config/index.js';
import { UserRole } from '../../types/index.js';
import type { AuthRequest } from './types.js';
import createHttpError from 'http-errors';

export class AuthenticationController {
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
  ) {}

  private async registerWithRole(req: Request, res: Response, role: UserRole) {
    const { name, email, password } = req.body;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({
        errors: result.array(),
      });
    }

    const user = await this.userService.create(name, email, password, role);

    const payload: JwtPayload = {
      sub: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload, user);

    res.cookie('accessToken', accessToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_AGE,
      httpOnly: true,
    });

    res.cookie('refreshToken', refreshToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_AGE,
      httpOnly: true,
    });

    res.status(201).json({
      id: user.id,
    });
  }

  async register(req: Request, res: Response, next: NextFunction) {
    return this.registerWithRole(req, res, UserRole.USER);
  }

  async registerTheaterOwner(req: Request, res: Response, next: NextFunction) {
    return this.registerWithRole(req, res, UserRole.MOVIE_THEATER_OWNER);
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    const result = validationResult(req);
    if(!result.isEmpty()){
      return res.status(400).json({
        errors: result.array(),
      });
    }

    const user = await this.userService.getUserByEmailWithPassword(email);

    if(!user){
      return res.status(400).json({
        status: "error",
        message: "credentials are wrong. please check email or password"
      })
    }

    const isPasswordMatched = await this.userService.isUserPasswordMatched(password, user.password);
      
    if(!isPasswordMatched) {
      return res.status(400).json({
        status: "error",
        message: "credentials are wrong. please check email or password"
      })
    }

    const payload: JwtPayload = {
      sub: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };


    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload, user);

    res.cookie('accessToken', accessToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_AGE,
      httpOnly: true,
    });

    res.cookie('refreshToken', refreshToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_AGE,
      httpOnly: true,
    });

    return res.status(200).json({
      status: "success",
      message: "user logged in successfully",
      id: user?.id
    });
  }

  async self(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.auth?.sub!;

    const user = await this.userService.getUserById(userId);

    return res.status(200).json({
      status: "success",
      message: "user detailed fetched successfully",
      user
    })
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.auth?.sub;

    const user = await this.userService.getUserById(Number(userId));

    if(!user) {
      const error = createHttpError(400, "user not found!");
      throw error
    }

    const payload: JwtPayload = {
      sub: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload, user);

    const refreshTokenId = Number(req.auth?.jti);
    await this.tokenService.deleteRefreshToken(refreshTokenId);

    res.cookie('accessToken', accessToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_AGE,
      httpOnly: true,
    });

    res.cookie('refreshToken', refreshToken, {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_AGE,
      httpOnly: true,
    });

    return res.status(200).json({
      status: "success",
      message: "user refresh token revoked and assigned new refresh token successfully",
      id: user?.id
    });
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    const refreshTokenId = Number(req.auth?.jti);

    await this.tokenService.deleteRefreshToken(refreshTokenId);
    
    res.clearCookie("accessToken", {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      httpOnly: true,
    })

    res.clearCookie("refreshToken", {
      domain: config.COOKIE_DOMAIN,
      sameSite: 'strict',
      httpOnly: true,
    })

    return res.json({})
  }
}
