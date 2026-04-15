import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_supplies')
export class Supplies {
  @PrimaryGeneratedColumn({ name: 'supp_id' })
  suppId: number;

  @Column({ name: 'supp_no', type: 'varchar', length: 45 })
  suppNo: string;

  @Column({ name: 'supp_img', type: 'text', nullable: true })
  suppImg: string | null;

  @Column({ name: 'supp_name', type: 'varchar', length: 250 })
  suppName: string;

  @Column({ name: 'supp_price', type: 'float', nullable: true })
  suppPrice: number | null;

  @Column({
    name: 'ts_id',
    type: 'int',
    default: 0,
    comment: 'ประเภทวัสดุ',
  })
  tsId: number;

  @Column({
    name: 'un_id',
    type: 'int',
    default: 0,
    comment: 'หน่วยนับ',
  })
  unId: number;

  @Column({ name: 'supp_detail', type: 'text', nullable: true })
  suppDetail: string | null;

  @Column({ name: 'supp_address', type: 'text', nullable: true })
  suppAddress: string | null;

  @Column({ name: 'supp_cap_max', type: 'int', default: 1 })
  suppCapMax: number;

  @Column({ name: 'supp_cap_min', type: 'int', default: 0 })
  suppCapMin: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
