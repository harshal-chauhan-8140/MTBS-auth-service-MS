import express from 'express';
import registerValidator from './validators/registerValidator.js';
import { asyncWrapper } from '../../utils/wrapper.js';
import { AppDataSource } from '../../data-source.js';
import { User } from '../user/userEntity.js';
import { RefreshToken } from '../token/refreshTokenEntity.js';
import { TokenService } from '../token/tokenService.js';
import { UserService } from '../user/userService.js';
import { AuthenticationController } from './authenticationController.js';
import loginValidator from './validators/loginValidator.js';
import authenticate from '../../common/middlewares/authenticate.js';
import validateRefreshToken from './middlewares/validateRefreshToken.js';
import parseRefreshToken from './middlewares/parseRefreshToken.js';

const router = express.Router();

const userRepository = AppDataSource.getRepository(User);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
const tokenService = new TokenService(refreshTokenRepository);
const userService = new UserService(userRepository);
const authenticationController = new AuthenticationController(userService, tokenService);

router.post(
  '/register',
  registerValidator,
  asyncWrapper(authenticationController.register.bind(authenticationController)),
);

router.post(
  '/login',
  loginValidator,
  asyncWrapper(authenticationController.login.bind(authenticationController)),
);

router.get(
  '/self',
  authenticate,
  asyncWrapper(authenticationController.self.bind(authenticationController)),
);

router.post(
  '/verify',
  authenticate,
  validateRefreshToken,
  asyncWrapper(authenticationController.refresh.bind(authenticationController)),
);

router.post(
  "/logout",
  authenticate,
  parseRefreshToken,
  asyncWrapper(authenticationController.logout.bind(authenticationController))
)

export default router;
