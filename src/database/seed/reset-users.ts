import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { User } from '../../users/entities/user.entity';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  entities: ['src/**/*.entity.ts'],
  synchronize: true,
});

async function resetUsers() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const userRepository = dataSource.getRepository(User);

    // Full reset - clear everything
    await userRepository.update({}, {
      failedAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaTempToken: null,
      mfaTempTokenExpires: null,
      mfaLastVerified: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
      biometricEnabled: false,
      deviceBiometricId: null,
      preferredMfaMethod: 'totp',
    });
    console.log('All users fully reset (MFA, lockouts, biometric cleared)');

    // Reset passwords too
    const users = await userRepository.find();
    for (const user of users) {
      const newPassword = user.email === 'admin@bancoverde.com' ? 'Admin123!' : 'Test123!';
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await userRepository.save(user);
      console.log(`Password reset: ${user.email} / ${newPassword}`);
    }

    // Create test users if they don't exist
    const testUsers = [
      { email: 'test1@bancoverde.com' },
      { email: 'test2@bancoverde.com' },
      { email: 'mfauser@bancoverde.com' },
    ];

    for (const testUser of testUsers) {
      const existing = await userRepository.findOne({ where: { email: testUser.email } });
      if (!existing) {
        const passwordHash = await bcrypt.hash('Test123!', 10);
        const user = userRepository.create({
          email: testUser.email,
          passwordHash,
          isActive: true,
          failedAttempts: 0,
        });
        await userRepository.save(user);
        console.log(`Created: ${testUser.email} / Test123!`);
      }
    }

    await dataSource.destroy();
    console.log('Full reset completed');
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

resetUsers();