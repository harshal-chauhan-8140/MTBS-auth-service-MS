import { expressjwt } from "express-jwt"
import { config } from "../../../config/index.js"
import type { Request } from "express"
import { REFRESH_TOKEN_GENERATION_ALGORITHM } from "../../../constants/index.js"
import { RefreshToken } from "../../token/refreshTokenEntity.js"
import { AppDataSource } from "../../../data-source.js"
import type { AuthCookie, RefreshTokenPayload } from "../types.js"

export default expressjwt({
    secret: config.REFRESH_TOKEN_PRIVATE_KEY,
    algorithms: [REFRESH_TOKEN_GENERATION_ALGORITHM],
    getToken(req: Request) {
        const { refreshToken } = req.cookies as AuthCookie;
        return refreshToken
    },
    async isRevoked(req: Request, token) {
        const payload = token?.payload as RefreshTokenPayload;

        try {
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken)
            const refreshToken = await refreshTokenRepository.findOne({
                where: {
                    id: Number(payload.jti),
                    user: {
                        id: Number(payload.sub),
                    },
                },
            })

            return refreshToken === null
        } catch {
            console.error("Error while getting the refresh token.", {
                id: payload.id,
            })
            return true
        }
    },
})
