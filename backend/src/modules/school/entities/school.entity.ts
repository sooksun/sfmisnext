import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('school')
export class School {
  @PrimaryGeneratedColumn({ name: 'sc_id' })
  scId: number;

  @Column({ type: 'int', nullable: true })
  smis: number;

  @Column({ name: 'sc_code', type: 'int', nullable: true })
  scCode: number;

  @Column({ name: 'sc_name', type: 'varchar', length: 100 })
  scName: string;

  @Column({ name: 'areacode', type: 'varchar', length: 10, nullable: true })
  areacode: string;

  @Column({ type: 'int', nullable: true })
  type: number;

  @Column({ type: 'int', nullable: true })
  geo: number;

  @Column({ name: 'spt', type: 'varchar', length: 50, nullable: true })
  spt: string;

  @Column({ name: 'add1', type: 'varchar', length: 50, nullable: true })
  add1: string;

  @Column({ name: 'add2', type: 'varchar', length: 50, nullable: true })
  add2: string;

  @Column({ name: 'tumbol', type: 'varchar', length: 50, nullable: true })
  tumbol: string;

  @Column({ name: 'p_code', type: 'int', nullable: true })
  pCode: number;

  @Column({ name: 'tel', type: 'varchar', length: 13, nullable: true })
  tel: string;

  @Column({ type: 'int', nullable: true })
  section: number;

  @Column({ name: 'insp_zone', type: 'int', nullable: true })
  inspZone: number;

  @Column({ name: 'low_class', type: 'varchar', length: 10, nullable: true })
  lowClass: string;

  @Column({ name: 'top_clsass', type: 'varchar', length: 50, nullable: true })
  topClass: string;

  @Column({ name: 'lat', type: 'varchar', length: 20, nullable: true })
  lat: string;

  @Column({ name: 'lng', type: 'varchar', length: 20, nullable: true })
  lng: string;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number;

  @UpdateDateColumn({ name: 'up_date', nullable: true })
  upDate: Date;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'logo', type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ name: 'header', type: 'varchar', length: 255, nullable: true })
  header: string;
}
