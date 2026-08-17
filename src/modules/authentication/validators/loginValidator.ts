import { checkSchema } from 'express-validator';

export default checkSchema({
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
    notEmpty: true
  },
});
