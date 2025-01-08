import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as parser from 'xml2json';

jest.mock('axios');
jest.mock('xml2json', () => ({
  toJson: jest.fn().mockReturnValue('{}'),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const configMap = {
                MAIL_SERVICE: 'http://mailservice',
                ORIGIN: 'TestOrigin',
                MAIL_DESTINATION: 'test@domain.com',
                MAIL_DESTINATION_CC: 'cc@domain.com',
              };
              return configMap[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      const body = 'test email body';
      const header = {};
      const result = await service.sendEmail(body, header);

      expect(axios.post).toHaveBeenCalledWith(
        'http://mailservice',
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'text/xml' },
        }),
      );
      expect(result).toBeUndefined();
    });

    it('should handle an error when sending an email', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to send'));

      const body = 'test email body';
      const header = {};
      const result = await service.sendEmail(body, header);

      expect(axios.post).toHaveBeenCalledWith(
        'http://mailservice',
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'text/xml' },
        }),
      );
      expect(result).toBe('Error al enviar el correo electrónico');
    });
  });

  describe('sendSoapRequest', () => {
    it('should send a SOAP request successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: '<xml></xml>' });
      const bodySoap = '<soap></soap>';
      const header = {};

      const result = await service.sendSoapRequest(bodySoap, header);

      expect(axios.post).toHaveBeenCalledWith(
        'http://mailservice',
        bodySoap,
        expect.objectContaining({
          headers: { 'Content-Type': 'text/xml' },
        }),
      );
      expect(result).toEqual({
        state: true,
        message: '',
        data: {},
      });
    });

    it('should handle an error when sending a SOAP request', async () => {
      (axios.post as jest.Mock).mockRejectedValue(
        new Error('SOAP request failed'),
      );

      const bodySoap = '<soap></soap>';
      const header = {};

      const result = await service.sendSoapRequest(bodySoap, header);

      expect(result).toEqual({
        state: false,
        message: 'SOAP request failed',
        data: '',
      });
    });
  });

  describe('sendEmail2', () => {
    it('should send an email using sendEmail2', async () => {
      (axios.request as jest.Mock).mockResolvedValue({ data: 'response data' });

      const mensaje = 'test message';
      await service.sendEmail2(mensaje);

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://mailservice',
          headers: {
            'Content-Type': 'text/xml',
            cookie: 'ASP.NET_SessionId=z0enpbgyn1iiozilb4njfs23',
          },
          data: expect.any(String),
        }),
      );
    });

    it('should handle an error when sending an email using sendEmail2', async () => {
      (axios.request as jest.Mock).mockRejectedValue(
        new Error('Request failed'),
      );

      const mensaje = 'test message';
      await service.sendEmail2(mensaje);

      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://mailservice',
          headers: {
            'Content-Type': 'text/xml',
            cookie: 'ASP.NET_SessionId=z0enpbgyn1iiozilb4njfs23',
          },
          data: expect.any(String),
        }),
      );
    });
  });

  describe('buildImportBulkDataXml', () => {
    it('should build the correct XML structure', () => {
      const mensaje = 'test message';
      const result = service.buildImportBulkDataXml(mensaje);

      expect(result).toContain('<pStrCuerpo>test message</pStrCuerpo>');
      expect(result).toContain(
        '<pStrAsunto>TestOrigin:Log de sesiones - Web cobranzas</pStrAsunto>',
      );
      expect(result).toContain(
        '<pStrDestinatario>test@domain.com</pStrDestinatario>',
      );
      expect(result).toContain(
        '<pStrDestinatarioCopia>cc@domain.com</pStrDestinatarioCopia>',
      );
    });
  });
});
