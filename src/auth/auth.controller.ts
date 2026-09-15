import {
  Controller,
  Post,
  Get,
  Body,
  Ip,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthService } from './jwt/jwt.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RefreshTokenDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string, @Req() request: any) {
    const device = request.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ip, device);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ip: string,
    @Req() request: any,
  ) {
    const device = request.headers['user-agent'] || 'unknown';
    return this.authService.refresh(
      refreshTokenDto.refreshToken,
      ip,
      device,
    );
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('x-user-id') userId: string,
    @Ip() ip: string,
    @Req() request: any,
  ) {
    const device = request.headers['user-agent'] || 'unknown';
    return this.authService.logout(
      refreshTokenDto.refreshToken,
      userId,
      ip,
      device,
    );
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() body: { token: string }) {
    return this.authService.verify(body.token);
  }

  @Get('me')
  @HttpCode(200)
  async me(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, message: 'Token no proporcionado' };
    }
    const token = authHeader.substring(7);
    const payload = this.jwtAuthService.verifyAccessToken(token);
    if (!payload) {
      return { success: false, message: 'Token inválido' };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
        biometricEnabled: user.biometricEnabled,
        preferredMfaMethod: user.preferredMfaMethod,
      },
    };
  }
}
