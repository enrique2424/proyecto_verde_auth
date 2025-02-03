import { Controller, Post, Body, Res, Req, Ip } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common/enums';

import { AuthService } from './auth.service';
import { LoginInterfaceApp } from './strategies/interfaces/login.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/sgc')
  async loginSGC(@Ip() ip, @Req() request, @Res() response, @Body() body) {
    const loginWeb: LoginInterfaceApp = {
      user: body.xxh1,
      password: body.xx99,
      tokenUnique: request.headers['xxpm'],
      ip,
      userAgent: request.headers['user-agent'],
    };
    const resultTokenBuilder = await this.authService.loginSGC(loginWeb);
    this.responseMet(response, resultTokenBuilder);
  }

  @Post('verify')
  verify(@Body() body) {
    return this.authService.verify(body.token);
  }

  @Post('verify/sgc')
  verifySGC(@Body() body) {
    return this.authService.verifySGC(body.token);
  }

  @Post('login/test')
  async test() {
    const resultTokenBuilder = {
      mensaje: 'Sistema de Gestiones Comerciales',
    };
    return resultTokenBuilder;
  }

  responseMet(response, payload) {
    console.log('payload====> ', payload);
    if (payload.success) {
      response.status(HttpStatus.OK).set({ xx14: '11' }).send(payload);
    } else {
      response.status(HttpStatus.UNAUTHORIZED).send({
        success: 'false',
        message: 'Problemas de conexión',
      });
    }
  }
}
