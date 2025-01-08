import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { btoa } from 'js-base64';

@Injectable()
export class TokenBuilderService {
  constructor(private readonly configServices: ConfigService) {}

  async login(user: string, password: string) {
    this.configServices.get('URL_TOKEN_BUILDER');
    const basicAuth = user + ':' + password;
    return await axios
      .get(this.configServices.get('URL_TOKEN_BUILDER'), {
        headers: {
          Authorization: 'Basic ' + btoa(basicAuth),
        },
      })
      .then((data) => {
        return data.data;
      })
      .catch((err) => {
        if (err.response.status == 401 || err.response !== undefined) {
          return {
            success: false,
            error: err.response.status,
            message: err.response.data.message,
          };
        } else {
          return {
            success: false,
            error: err.code,
          };
        }
      });
  }
}
