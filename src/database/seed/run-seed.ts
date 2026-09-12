import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedAdminUser } from './admin-user.seed';

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

async function run() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    await seedAdminUser(dataSource);

    await dataSource.destroy();
    console.log('Seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

run();
