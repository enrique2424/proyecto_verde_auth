import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', type: 'text', nullable: true })
  mfaSecret: string | null;

  @Column({ name: 'mfa_backup_codes', type: 'text', nullable: true })
  mfaBackupCodes: string | null;

  @Column({ name: 'mfa_temp_token', type: 'text', nullable: true })
  mfaTempToken: string | null;

  @Column({ name: 'mfa_temp_token_expires', type: 'timestamp', nullable: true })
  mfaTempTokenExpires: Date | null;

  @Column({ name: 'mfa_last_verified', type: 'timestamp', nullable: true })
  mfaLastVerified: Date | null;

  @Column({ name: 'mfa_failed_attempts', default: 0 })
  mfaFailedAttempts: number;

  @Column({ name: 'mfa_locked_until', type: 'timestamp', nullable: true })
  mfaLockedUntil: Date | null;

  @Column({ name: 'biometric_enabled', default: false })
  biometricEnabled: boolean;

  @Column({ name: 'device_biometric_id', type: 'text', nullable: true })
  deviceBiometricId: string | null;

  @Column({ name: 'preferred_mfa_method', type: 'varchar', default: 'totp' })
  preferredMfaMethod: 'totp' | 'biometric';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];
}
