import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBuilderService } from 'src/token-builder/token-builder.service';
import { Usuarios } from './entities/usuarios.entity';
import { TokenUnique } from './entities/token_unique.entity';
import { LoginInterfaceApp } from './strategies/interfaces/login.interface';
import { TokenCryptService } from './token-crypt/token-crypt.service';
import { AppDevicesService } from 'src/app-devices/app-devices.service';
import { ConfigService } from '@nestjs/config';

const sha256 = require('sha256');
const { BIND_OUT, STRING, NUMBER } = require('typeorm');

export class AuthService {
  constructor(
    @InjectRepository(Usuarios)
    private readonly usuarioRepository: Repository<Usuarios>,
    private readonly jwtService: JwtService,
    private readonly tokenBuilderServices: TokenBuilderService,
    private readonly tokenCrypts: TokenCryptService,
    private readonly deviceService: AppDevicesService,
    @InjectRepository(TokenUnique)
    private readonly tokenUnique: Repository<TokenUnique>,
    private readonly configServices: ConfigService,
  ) {}

  async loginSGC(loginParams: LoginInterfaceApp) {
    try {
      await this.validateTokenUniqueUse(loginParams);
      const result = await this.tokenBuilderServices.login(
        loginParams.user,
        loginParams.password,
      );
      if (result.success) {
        const resultQuery = await this.loadSGC(loginParams.user);
        resultQuery['ip'] = loginParams.ip;
        resultQuery['userAgent'] = loginParams.userAgent;
        return this.buildResultFromUserSGC(resultQuery);
      } else {
        const messege = 'Usuario: ' + loginParams.user + ' - ' + result.message;
        console.log('Correo enviado->3', messege);

        return result;
      }
    } catch (error) {
      console.log(
        'Error en el controlador -> AuthService -> loginSGC: ' + error.message,
      );
      return {
        success: false,
        message: 'error en el controlador',
      };
    }
  }

  public builtToken(user) {
    return this.jwtService.sign(user);
  }

  async verify(token) {
    try {
      const buffer = Buffer.from(token, 'base64');
      const decode = await this.tokenCrypts.decode(buffer);
      return this.jwtService.verify(decode.toString('ascii'));
    } catch (error) {
      console.log(
        'Error en el controlador -> AuthService -> verify: ' + error.message,
      );
      return {
        status: false,
        message: 'Token Invalido',
      };
    }
  }

  async verifySGC(token) {
    try {
      const buffer = Buffer.from(token, 'base64');
      const decode = await this.tokenCrypts.decode(buffer);
      return this.jwtService.verify(decode.toString('ascii'));
    } catch (error) {
      console.log(
        'Error en el controlador -> AuthService -> verifySGC: ' + error.message,
      );
      return {
        status: false,
        message: 'Token Invalido',
      };
    }
  }

  async load(clave: string, role: string) {
    try {
      const queryBuilder = this.usuarioRepository.createQueryBuilder('u');
      const resultQueryBuilder = await queryBuilder
        .select([
          '"u"."NOMBRE"',
          '"c"."IDENTIFICACION" AS COD_COBRADOR',
          '"u"."CLAVE"',
          '"c"."ID_ROLE"',
          '"g"."GRUPO" AS COD_GRUPO',
          '"g"."DESCRIPCION" AS NOMBRE_GRUPO',
        ])
        .innerJoin('CRE_CEF_COBRADOR', 'c', 'u.CLAVE="c"."COD_USUARIO"')
        .innerJoin('GRUPOS', 'g', '"u"."GRUPO"="g"."GRUPO"')
        .where(
          `clave=:clave and u.tz_lock=0 and "g"."TZ_LOCK"=0 AND "c"."TZ_LOCK"=0 ${role}`,
          {
            clave,
          },
        )
        .getRawOne();
      if (resultQueryBuilder === undefined)
        throw new Error('no se encontro al usuario');
      return {
        Name: resultQueryBuilder.NOMBRE,
        CodCollector: resultQueryBuilder.COD_COBRADOR,
        Id: resultQueryBuilder.CLAVE,
        RoleId: resultQueryBuilder.ID_ROLE,
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  async updTKN(pIntCodobrador: number, pToken: string) {
    let pIntExisteError;
    let pStrMensajeError;
    try {
      const query = `
			DECLARE
				PINTCODOBRADOR NUMBER;
				PTOKEN CLOB;
				PINTEXISTEERROR NUMBER;
				PSTRMENSAJEERROR VARCHAR2(200);
			BEGIN
				pIntExisteError := 0;
				pStrMensajeError := '';	
			
				PKG_CRE_CEF_COBRADOR.SPR_UPD_TOKEN(
					PINTCODOBRADOR => :pIntCodobrador,
					PTOKEN => :pToken,
					PINTEXISTEERROR => PINTEXISTEERROR,
					PSTRMENSAJEERROR => PSTRMENSAJEERROR
				);
				:pIntExisteError := pIntExisteError;
				:pStrMensajeError := pStrMensajeError;
			END;`;
      await this.tokenUnique.query(query, [
        pIntCodobrador,
        pToken,
        pIntExisteError,
        pStrMensajeError,
      ]);
    } catch (error) {
      console.log('ERROR: AuthService -> updTKN: ' + error.message);
      throw new Error(error);
    }
  }

  public async buildResultFromUser(resultQuery) {
    const usuariosJwtPayload = {
      name: resultQuery.Name,
      collectorId: resultQuery.CodCollector,
      id: resultQuery.Id,
      roleId: resultQuery.RoleId,
      ip: resultQuery.ip,
      userAgent: resultQuery.userAgent,
    };
    if (resultQuery.idDevice) {
      usuariosJwtPayload['idDevice'] = resultQuery.idDevice;
    }
    const token = this.builtToken(usuariosJwtPayload);
    const encode = await this.tokenCrypts.encode(token);
    const roleIdBase64 = Buffer.from(
      resultQuery.RoleId.toString(),
      'binary',
    ).toString('base64');
    const response = {
      success: true,
      data: {
        token: encode.toString('base64'),
        userDetails: {
          name: resultQuery.Name,
          xx24: roleIdBase64,
        },
      },
    };
    await this.updTKN(usuariosJwtPayload.collectorId, response.data.token);
    return response;
  }

  async loadSGC(clave: string) {
    try {
      const queryBuilder = this.usuarioRepository
        .createQueryBuilder('u')
        .select([
          '"u"."NOMBRE"',
          '"C"."COD_USUARIO" AS COD_COBRADOR',
          '"u"."CLAVE"',
          '"C"."ID_BANCA"',
          '"B"."NOMBRE" AS BANCA',
          '"C"."ID_OFICINA"',
          '"so"."NOMBRE" AS OFICINA',
          '"so"."ID_PLAZA"',
          '"sp"."NOMBRE" AS PLAZA',
          '"G"."OBJETIVO" AS OBJETIVO',
          '"C"."ID_ROL"',
          '"G"."DESCRIPCION" AS ROL',
        ])
        .innerJoin('SGC_USUARIO', 'C', 'u.CLAVE="C"."COD_USUARIO"')
        .innerJoin('SGC_ROL', 'G', '"C"."ID_ROL"="G"."IDENTIFICADOR"')
        .innerJoin('SGC_BANCA', 'B', '"C"."ID_BANCA"="B"."IDENTIFICADOR"')
        .innerJoin('SGC_OFICINA', 'so', '"C"."ID_OFICINA"="so"."IDENTIFICADOR"')
        .innerJoin('SGC_PLAZA', 'sp', '"so"."ID_PLAZA"="sp"."IDENTIFICADOR"')
        .where(
          `clave='${clave}' and u.TZ_LOCK=0 and "G"."TZ_LOCK"=0 AND "C"."TZ_LOCK"=0`,
        );
      const resultQueryBuilder = await queryBuilder.getRawOne();

      if (!resultQueryBuilder) throw new Error('no se encontro al usuario');
      return {
        Name: resultQueryBuilder.NOMBRE,
        CodUser: resultQueryBuilder.COD_COBRADOR,
        IdBanca: resultQueryBuilder.ID_BANCA,
        Banca: resultQueryBuilder.BANCA,
        IdOficina: resultQueryBuilder.ID_OFICINA,
        Oficina: resultQueryBuilder.OFICINA,
        IdPlaza: resultQueryBuilder.ID_PLAZA,
        Plaza: resultQueryBuilder.PLAZA,
        Role: resultQueryBuilder.ROL,
        RoleId: resultQueryBuilder.ID_ROL,
        Objetivo: resultQueryBuilder.OBJETIVO,
      };
    } catch (error) {
      console.error('Error en loadSGC:', error);
      throw new Error(error.message || 'Error desconocido');
    }
  }

  async updTKNSGC(pUsuario: number, pToken: string) {
    let pIntExisteError;
    let pStrMensajeError;
    try {
      const query = `
			DECLARE
				PSTRUSUARIO VARCHAR2(10);
				PTOKEN CLOB;
				PINTEXISTEERROR NUMBER;
				PSTRMENSAJEERROR VARCHAR2(200);
			BEGIN
				pIntExisteError := 0;
				pStrMensajeError := '';	
			
				GANADERO.PKG_SGC_USUARIO.SPR_UPD_TOKEN(
					PSTRUSUARIO => :pUsuario,
					PTOKEN => :pToken,
					PINTEXISTEERROR => PINTEXISTEERROR,
					PSTRMENSAJEERROR => PSTRMENSAJEERROR
				);
				:pIntExisteError := pIntExisteError;
				:pStrMensajeError := pStrMensajeError;
			END;`;
      await this.tokenUnique.query(query, [
        pUsuario,
        pToken,
        pIntExisteError,
        pStrMensajeError,
      ]);
    } catch (error) {
      console.log('ERROR: AuthService -> updTKNSGC: ' + error.message);
      throw new Error(error);
    }
  }

  public async buildResultFromUserSGC(resultQuery) {
    const usuariosJwtPayload = {
      name: resultQuery.Name,
      codUser: resultQuery.CodUser,
      idBanca: resultQuery.IdBanca,
      banca: resultQuery.Banca,
      idPlaza: resultQuery.IdPlaza,
      plaza: resultQuery.Plaza,
      idOficina: resultQuery.IdOficina,
      oficina: resultQuery.Oficina,
      role: resultQuery.Role,
      roleId: resultQuery.RoleId,
      Objetivo: resultQuery.Objetivo,
      ip: resultQuery.ip,
      userAgent: resultQuery.userAgent,
    };

    const token = this.builtToken(usuariosJwtPayload);
    const encode = await this.tokenCrypts.encode(token);
    const roleIdBase64 = Buffer.from(
      resultQuery.RoleId.toString(),
      'binary',
    ).toString('base64');
    const roleNameBase64 = Buffer.from(resultQuery.Role, 'binary').toString(
      'base64',
    );
    const codeUserBase64 = Buffer.from(
      resultQuery.CodUser.toString(),
      'binary',
    ).toString('base64');

    const idBancaBase64 = Buffer.from(
      resultQuery.IdBanca.toString(),
      'binary',
    ).toString('base64');

    const bancaBase64 = Buffer.from(
      resultQuery.Banca.toString(),
      'binary',
    ).toString('base64');

    const idPlazaBase64 = Buffer.from(
      resultQuery.IdPlaza.toString(),
      'binary',
    ).toString('base64');

    const plazaBase64 = Buffer.from(
      resultQuery.Plaza.toString(),
      'binary',
    ).toString('base64');

    const idOficinaBase64 = Buffer.from(
      resultQuery.IdOficina.toString(),
      'binary',
    ).toString('base64');

    const oficinaBase64 = Buffer.from(
      resultQuery.Oficina.toString(),
      'binary',
    ).toString('base64');

    const objetivoBase64 = Buffer.from(
      resultQuery.Objetivo.toString(),
      'binary',
    ).toString('base64');

    const response = {
      success: true,
      data: {
        token: encode.toString('base64'),
        userDetails: {
          name: resultQuery.Name,
          xz20: codeUserBase64,
          xv10: idBancaBase64,
          xt11: bancaBase64,
          xa30: idPlazaBase64,
          xr51: plazaBase64,
          xm21: idOficinaBase64,
          xd65: oficinaBase64,
          xx24: roleIdBase64,
          xy15: roleNameBase64,
          xr22: objetivoBase64,
        },
      },
    };
    await this.updTKNSGC(usuariosJwtPayload.codUser, response.data.token);
    return response;
  }

  public async validateTokenUniqueUse(loginParams: LoginInterfaceApp) {
    try {
      console.log('loginParams===> ', loginParams);
      const userHash = loginParams.tokenUnique.substring(0, 64);
      const passwordHash = loginParams.tokenUnique.substring(128, 192);
      if (sha256(loginParams.user) !== userHash) {
        console.log('user: el token es invalido');
        throw new Error('user: el token es invalido');
      }
      if (sha256(loginParams.password) !== passwordHash) {
        console.log('password: el token es invalido');
        throw new Error('password: el token es invalido');
      }
      const existsInDB = await this.checkTokenUniqueUse(
        loginParams.tokenUnique,
      );
      if (existsInDB) return true;
      else {
        throw new Error('token invalido');
      }
    } catch (error) {
      throw new error(error);
    }
  }

  async checkTokenUniqueUse(token: string): Promise<boolean> {
    console.log('token===> ', token);
    const result = await this.tokenUnique
      .createQueryBuilder()
      .where('token=:token', { token })
      .getOne()
      .then((result) => {
        if (!result) {
          this.storeTokenUsed(token);
          return true;
        } else {
          console.log('Estan robando el token: ', result);
          return false;
        }
      })
      .catch((error) => {
        throw new Error(error);
      });
    return result;
  }

  async storeTokenUsed(token: string) {
    const entityToken = new TokenUnique();
    entityToken.fechaCreacion = new Date();
    entityToken.token = token;
    await this.tokenUnique.insert(entityToken).catch((error) => {
      throw new Error(error);
    });
  }
}
