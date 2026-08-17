import { expressjwt } from "express-jwt"
import type { Request } from "express"
import { config } from "../../../config/index.js"
import type { AuthCookie } from "../types.js"

export default expressjwt({
    secret: config.REFRESH_TOKEN_PRIVATE_KEY,
    algorithms: ["HS256"],
    getToken(req: Request) {
        const { refreshToken } = req.cookies as AuthCookie
        return refreshToken
    },
})
