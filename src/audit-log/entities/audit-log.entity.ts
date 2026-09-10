import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_log')
@Index(['userId', 'timestamp'])
@Index(['action', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  action: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  device: string | null;

  @CreateDateColumn({ name: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'boolean', default: true })
  success: boolean;
}
