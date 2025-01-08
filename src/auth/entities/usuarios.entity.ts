import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'USUARIOS' })
export class Usuarios {
  @PrimaryColumn({ name: 'CLAVE', primary: false, type: 'varchar2' })
  clave: string;

  @Column({ name: 'NOMBRE', type: 'varchar2' })
  nombre: string;

  @Column({ name: 'TZ_LOCK', type: 'number' })
  tz_lock: number;
}
