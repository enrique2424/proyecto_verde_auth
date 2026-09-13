export enum NotificationType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  NEW_DEVICE_LOGIN = 'new_device_login',
  PASSWORD_CHANGED = 'password_changed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  SESSION_REVOKED = 'session_revoked',
  ACCOUNT_LOCKED = 'account_locked',
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendNotificationDto {
  fcmToken: string;
  notification: NotificationPayload;
  notificationType: NotificationType;
}

export interface DeviceInfo {
  deviceName?: string;
  os?: string;
  browser?: string;
  ip?: string;
}
