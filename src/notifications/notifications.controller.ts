import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType, SendNotificationDto, DeviceInfo } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test')
  async sendTestNotification(@Body() body: { fcmToken: string; type: NotificationType }) {
    this.logger.log(`Sending test notification of type: ${body.type}`);

    const deviceInfo: DeviceInfo = {
      deviceName: 'Test Device',
      os: 'Test OS',
      browser: 'Test Browser',
      ip: '127.0.0.1',
    };

    switch (body.type) {
      case NotificationType.LOGIN_SUCCESS:
        return this.notificationsService.sendLoginSuccessNotification(body.fcmToken, deviceInfo);

      case NotificationType.LOGIN_FAILED:
        return this.notificationsService.sendLoginFailedNotification(body.fcmToken, deviceInfo, 3);

      case NotificationType.NEW_DEVICE_LOGIN:
        return this.notificationsService.sendNewDeviceLoginNotification(body.fcmToken, deviceInfo);

      case NotificationType.ACCOUNT_LOCKED:
        const unlockTime = new Date(Date.now() + 15 * 60 * 1000);
        return this.notificationsService.sendAccountLockedNotification(body.fcmToken, unlockTime);

      case NotificationType.PASSWORD_CHANGED:
        return this.notificationsService.sendPasswordChangedNotification(body.fcmToken);

      case NotificationType.MFA_ENABLED:
        return this.notificationsService.sendMfaEnabledNotification(body.fcmToken);

      case NotificationType.SESSION_REVOKED:
        return this.notificationsService.sendSessionRevokedNotification(body.fcmToken);

      default:
        return { success: false, error: 'Unknown notification type' };
    }
  }

  @Get('types')
  getNotificationTypes() {
    return Object.values(NotificationType);
  }
}
