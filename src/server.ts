import app from './app.js';
import { config } from './config/index.js';
import { AppDataSource } from './data-source.js';

const startHttpServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    app.listen(Number(config.PORT), () => {
      console.log(`Server is running on PORT: ${config.PORT}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  }
};

startHttpServer();
