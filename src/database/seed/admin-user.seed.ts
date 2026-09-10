import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../users/entities/user.entity';

export async function seedAdminUser(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@bancoverde.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const admin = userRepository.create({
      email: 'admin@bancoverde.com',
      passwordHash,
      isActive: true,
      failedAttempts: 0,
    });
    await userRepository.save(admin);
    console.log('Admin user created: admin@bancoverde.com / Admin123!');
  } else {
    console.log('Admin user already exists');
  }
}
