import type { Request } from "express"
import type { JwtPayload } from "jsonwebtoken"

export interface AuthRequest extends Request {
    auth?: {
        sub: number
        email: string
        role: string
        jti?: string
    }
}

export interface RefreshTokenPayload extends JwtPayload {
    id: string | number
}

export interface AuthCookie {
    accessToken?: string
    refreshToken?: string
}