import { checkSchema } from 'express-validator';

export default checkSchema({
  id: {
    in: ['params'],
    errorMessage: 'id must be a valid user id',
    isInt: {
      options: { min: 1 },
    },
  },
  theaterId: {
    in: ['body'],
    errorMessage: 'theaterId must be a valid id',
    isInt: {
      options: { min: 1 },
    },
  },
});
