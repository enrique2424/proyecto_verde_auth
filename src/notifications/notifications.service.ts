import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { NotificationType, SendNotificationDto, DeviceInfo } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmInitialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeFcm();
  }

  private initializeFcm(): void {
    try {
      // Try to read from local JSON file first
      const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.fcmInitialized = true;
        this.logger.log('Firebase Cloud Messaging initialized from firebase-service-account.json');
        return;
      }

      // Fallback: try FIREBASE_SERVICE_ACCOUNT env variable (JSON string)
      const serviceAccountJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');

      if (!serviceAccountJson) {
        this.logger.warn(
          'Firebase not configured. Create firebase-service-account.json in project root or ' +
          'set FIREBASE_SERVICE_ACCOUNT in .env to enable push notifications.',
        );
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.fcmInitialized = true;
      this.logger.log('Firebase Cloud Messaging initialized from FIREBASE_SERVICE_ACCOUNT env');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Cloud Messaging', error);
    }
  }

  async sendPushNotification(dto: SendNotificationDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.fcmInitialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: dto.fcmToken,
        notification: {
          title: dto.notification.title,
          body: dto.notification.body,
        },
        data: {
          type: dto.notificationType,
          ...dto.notification.data,
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendLoginSuccessNotification(
    fcmToken: string,
    deviceInfo: DeviceInfo,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.LOGIN_SUCCESS,
      notification: {
        title: 'Inicio de sesión exitoso',
        body: `Sesión iniciada desde ${deviceInfo.deviceName || 'dispositivo desconocido'} (${
          deviceInfo.ip || 'IP no disponible'
        })`,
        data: {
          deviceName: deviceInfo.deviceName || '',
          ip: deviceInfo.ip || '',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendNewDeviceLoginNotification(
    fcmToken: string,
    deviceInfo: DeviceInfo,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.NEW_DEVICE_LOGIN,
      notification: {
        title: 'Nuevo inicio de sesión detectado',
        body: `Se detectó un inicio de sesión desde un nuevo dispositivo: ${
          deviceInfo.deviceName || 'desconocido'
        }. Si no fuiste tú, comunícate con soporte inmediatamente.`,
        data: {
          deviceName: deviceInfo.deviceName || '',
          ip: deviceInfo.ip || '',
          os: deviceInfo.os || '',
          browser: deviceInfo.browser || '',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendLoginFailedNotification(
    fcmToken: string,
    deviceInfo: DeviceInfo,
    attemptsLeft: number,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.LOGIN_FAILED,
      notification: {
        title: 'Intento de inicio de sesión fallido',
        body: `Se registró un intento de inicio de sesión fallido. Intentos restantes: ${attemptsLeft}.`,
        data: {
          attemptsLeft: attemptsLeft.toString(),
          ip: deviceInfo.ip || '',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendAccountLockedNotification(
    fcmToken: string,
    unlockTime: Date,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.ACCOUNT_LOCKED,
      notification: {
        title: 'Cuenta bloqueada',
        body: `Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Se desbloqueará automáticamente a las ${unlockTime.toLocaleTimeString()}.`,
        data: {
          unlockTime: unlockTime.toISOString(),
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendPasswordChangedNotification(fcmToken: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.PASSWORD_CHANGED,
      notification: {
        title: 'Contraseña actualizada',
        body: 'Tu contraseña fue modificada exitosamente. Si no realizaste este cambio, contacta a soporte.',
        data: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendMfaEnabledNotification(fcmToken: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.MFA_ENABLED,
      notification: {
        title: 'MFA habilitado',
        body: 'La autenticación multifactor ha sido activada en tu cuenta.',
        data: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async sendSessionRevokedNotification(fcmToken: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendPushNotification({
      fcmToken,
      notificationType: NotificationType.SESSION_REVOKED,
      notification: {
        title: 'Sesión revocada',
        body: 'Una de tus sesiones ha sido revocada. Si no fuiste tú, comunícate con soporte.',
        data: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}
