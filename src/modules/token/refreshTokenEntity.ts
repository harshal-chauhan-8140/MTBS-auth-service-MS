import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../user/userEntity.js';

@Entity({
  name: 'refreshTokens',
})
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @UpdateDateColumn()
  updatedAt!: number;

  @CreateDateColumn()
  createdAt!: number;
}
