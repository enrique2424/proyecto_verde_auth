import {
  Controller,
  Post,
  Body,
  Ip,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
