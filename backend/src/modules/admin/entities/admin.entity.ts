import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admin' })
export class Admin {
  @PrimaryGeneratedColumn({ name: 'admin_id' })
  adminId: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ name: 'password_default', nullable: true })
  passwordDefault?: string;

  @Column({ name: 'last_login', type: 'datetime', nullable: true })
  lastLogin?: Date;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'code_login', nullable: true })
  codeLogin?: string;

  @Column({ nullable: true })
  avata?: string;

  @Column({ type: 'text', nullable: true })
  license?: string;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy?: number;

  @Column({ name: 'up_date', type: 'datetime', nullable: true })
  upDate?: Date;

  @Column({ type: 'int', nullable: true })
  type?: number;

  @Column({ type: 'int', nullable: true })
  position?: number;

  @Column({ name: 'cre_date', type: 'datetime', nullable: true })
  creDate?: Date;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;
}
