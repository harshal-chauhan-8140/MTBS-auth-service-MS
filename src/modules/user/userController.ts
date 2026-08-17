import { validationResult } from 'express-validator';
import type { Request, Response } from 'express';
import type { UserService } from './userService.js';

export class UserController {
  constructor(private userService: UserService) {}

  async create(req: Request, res: Response) {
    const { name, email, password, role } = req.body;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({
        errors: result.array(),
      });
    }

    const user = await this.userService.create(name, email, password, role);

    res.status(201).json({
      id: user.id,
    });
  }
}
