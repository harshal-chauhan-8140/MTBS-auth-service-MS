import { checkSchema } from 'express-validator';
import { UserRole } from '../../../types/index.js';

export default checkSchema({
  name: {
    trim: true,
    errorMessage: 'name field is required',
    notEmpty: true,
  },
  email: {
    trim: true,
    errorMessage: 'email field is required',
    notEmpty: true,
    isEmail: {
      errorMessage: 'Email should be a valid email',
    },
  },
  password: {
    trim: true,
    errorMessage: 'password field is required',
    notEmpty: true,
    isStrongPassword: {
      errorMessage: 'Password should be strong',
    },
    isLength: {
      options: {
        min: 8,
      },
      errorMessage: 'Password length should be at least 8 chars!',
    },
  },
  role: {
    trim: true,
    errorMessage: 'role field is required',
    notEmpty: true,
    isIn: {
      options: [Object.values(UserRole)],
      errorMessage: `role must be one of: ${Object.values(UserRole).join(', ')}`,
    },
  },
});
