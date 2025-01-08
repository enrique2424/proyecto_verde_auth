import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import * as parser from 'xml2json';

const config: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'text/xml',
  },
};

@Injectable()
export class EmailService {
  constructor(private readonly configServices: ConfigService) {}

  async sendEmail(body: string, header: any) {
    const url = this.configServices.get('MAIL_SERVICE');
    let email = this.buildImportBulkDataXml(body);
    try {
      const response = await axios.post(url, email, config);
      if (response.status == 200) {
        console.log('Enviado');
      }
      return;
    } catch (error) {
      console.log('Error: No se pudo enviar el correo...' + error.message);
      return 'Error al enviar el correo electrónico';
    }
  }

  async sendSoapRequest(bodySoap: string, header: any) {
    try {
      const response = await axios.post(
        this.configServices.get('MAIL_SERVICE'),
        bodySoap,
        config,
      );
      const convertXmlSoap = JSON.parse(parser.toJson(response.data));
      return {
        state: true,
        message: '',
        data: convertXmlSoap,
      };
    } catch (error) {
      console.log(
        'Error.message mail.service -> sendSoapRequest: ' + error.message,
      );
      return {
        state: false,
        message: error.message || 'Error al enviar la solicitud SOAP',
        data: '',
      };
    }
  }

  async sendEmail2(mensaje: any) {
    const options = {
      method: 'POST',
      url: this.configServices.get('MAIL_SERVICE'),
      headers: {
        cookie: 'ASP.NET_SessionId=z0enpbgyn1iiozilb4njfs23',
        'Content-Type': 'text/xml',
      },
      data: this.buildImportBulkDataXml(mensaje),
    };

    axios
      .request(options)
      .then(function (response) {
        console.log('sendEmail2: ', response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  buildImportBulkDataXml(mensaje: string) {
    const xml = `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
       <Body>
       <ProcesarMail_Libre xmlns="http://192.168.1.186/WSMail/">
       <pStrIdFormatoCorreo>0</pStrIdFormatoCorreo>
       <pStrCodSistemaOrigen>3</pStrCodSistemaOrigen>
       <pStrCodProcesoOrigen>3</pStrCodProcesoOrigen>
       <pStrAsunto>${
         this.configServices.get('ORIGIN') + ':Log de sesiones - Web cobranzas'
       }</pStrAsunto>
       <pStrEncabezado>Sesion: </pStrEncabezado>
       <pStrCuerpo>${mensaje}</pStrCuerpo>
       <pStrPie>Saludos Cordiales</pStrPie>
       <pStrRemitente>cobranzas@bg.com.bo</pStrRemitente>
       <pStrDestinatario>${this.configServices.get(
         'MAIL_DESTINATION',
       )}</pStrDestinatario>
       <pStrDestinatarioCopia>${this.configServices.get(
         'MAIL_DESTINATION_CC',
       )}</pStrDestinatarioCopia>
       <pStrDestinatarioOculto></pStrDestinatarioOculto>
       <pStrNroServidorSmtp>1</pStrNroServidorSmtp>
       <pStrResSal></pStrResSal>
       <pStrPathArchivo></pStrPathArchivo>
       <pStrUser>WEB</pStrUser>
       </ProcesarMail_Libre>
       </Body></Envelope>`;

    return xml;
  }
}
