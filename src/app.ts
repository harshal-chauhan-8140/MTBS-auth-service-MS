import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import express, { type Request, type Response } from 'express';
import authenticationRouter from './modules/authentication/authenticationRouter.js';
import { globalErrorHandler } from './common/middlewares/globalErrorHandler.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public', { dotfiles: 'allow' }));

app.use('/auth', authenticationRouter);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    msg: 'server is running.',
  });
});

app.use(globalErrorHandler);

export default app;
