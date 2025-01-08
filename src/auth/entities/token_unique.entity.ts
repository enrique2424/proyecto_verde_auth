import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('GANADERO.CRE_CEF_TOKENS')
export class TokenUnique {
  @PrimaryColumn({ name: 'IDENTIFICACION', primary: false, type: 'varchar2' })
  identificacion: string;

  @Column({ name: 'TOKEN', type: 'varchar2' })
  token: string;

  @Column({ name: 'FECHA_CREACION', type: 'date' })
  fechaCreacion: Date;
}
