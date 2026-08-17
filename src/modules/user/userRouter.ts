import express from 'express';
import { AppDataSource } from '../../data-source.js';
import { User } from './userEntity.js';
import { UserService } from './userService.js';
import { UserController } from './userController.js';
import createUserValidator from './validators/createUserValidator.js';
import addTheaterValidator from './validators/addTheaterValidator.js';
import authenticate from '../../common/middlewares/authenticate.js';
import { canAccess } from '../../common/middlewares/canAccess.js';
import { verifyInternalService } from '../../common/middlewares/verifyInternalService.js';
import { asyncWrapper } from '../../utils/wrapper.js';
import { UserRole } from '../../types/index.js';

const router = express.Router();

const userRepository = AppDataSource.getRepository(User);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post(
  '/',
  authenticate,
  canAccess([UserRole.ADMIN]),
  createUserValidator,
  asyncWrapper(userController.create.bind(userController)),
);

router.patch(
  '/:id/theaters',
  verifyInternalService,
  addTheaterValidator,
  asyncWrapper(userController.addTheater.bind(userController)),
);

export default router;
