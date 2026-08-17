import type { Repository } from 'typeorm';
import type { User } from './userEntity.js';
import { UserRole } from '../../types/index.js';
import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';

export class UserService {
  constructor(private userRepository: Repository<User>) {}

  async create(name: string, email: string, password: string, role: string = UserRole.USER) {
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (user) {
      const error = createHttpError(400, 'User already exist with given email address');
      throw error;
    }

    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);

    try {
      return await this.userRepository.save({
        name,
        email,
        password: hashedPassword,
        role,
      });
    } catch {
      const error = createHttpError(500, 'Failed to store data in database');
      throw error;
    }
  }

  async getUserByEmailWithPassword(email: string) {
    return await this.userRepository.findOne({
      where: {
        email
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true
      }
    })
  }

  async isUserPasswordMatched(password: string, hashedPassword: string){
    return await bcrypt.compare(password, hashedPassword);
  }

  async getUserById(id: number){
    return await this.userRepository.findOne({
      where: {
        id
      }
    })
  }
} 
