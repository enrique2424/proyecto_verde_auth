import { Entity, Column } from 'typeorm';

@Entity({ name: 'CRE_CEF_DEVICES' })
export class devices {
  @Column({ name: 'COD_COBRADOR', primary: false, type: 'number' })
  codCobador: number;

  @Column({ name: 'ID_DEVICES', type: 'varchar2' })
  idDevice: string;

  @Column({ name: 'FECHA_CREACION', type: 'date' })
  createAt: string;

  @Column({ name: 'FECHA_MODIFICACION', type: 'timestamp' })
  updatedAt: string;

  @Column({ name: 'USUARIO_MODIFICACION', type: 'number' })
  userUpdate: string;

  @Column({ name: 'TZ_LOCK', type: 'number' })
  tz_lock: number;
}
