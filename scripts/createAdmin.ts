import 'reflect-metadata';
import { AppDataSource } from '../src/data-source.js';
import { User } from '../src/modules/user/userEntity.js';
import { UserService } from '../src/modules/user/userService.js';
import { UserRole } from '../src/types/index.js';

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: npm run create-admin -- "<name>" <email> <password>');
  process.exit(1);
}

await AppDataSource.initialize();

const userService = new UserService(AppDataSource.getRepository(User));
const admin = await userService.create(name, email, password, UserRole.ADMIN);

console.log(`Admin created: ${admin.email} (id: ${admin.id})`);

await AppDataSource.destroy();
