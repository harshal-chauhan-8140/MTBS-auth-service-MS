import 'reflect-metadata';

import express, { type Request, type Response } from 'express';

const app = express();

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    msg: 'server is running.',
  });
});

export default app;
