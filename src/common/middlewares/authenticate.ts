import { expressjwt, type GetVerificationKey } from "express-jwt";
import jwksClient from "jwks-rsa";
import type { Request } from "express";
import { config } from "../../config/index.js";
import { ACCESS_TOKEN_GENERATION_ALGORITHM } from "../../constants/index.js";

export default expressjwt({
    secret: jwksClient.expressJwtSecret({
        jwksUri: config.JWKS_URI,
        cache: true,
        rateLimit: true,
    }) as GetVerificationKey,
    algorithms: [ACCESS_TOKEN_GENERATION_ALGORITHM],
    getToken(req: Request) {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.split(" ")[1] !== "undefined") {
            const token = authHeader.split(" ")[1];
            if (token) {
                return token;
            }
        }

        const { accessToken } = req.cookies;
        return accessToken;
    },
});
