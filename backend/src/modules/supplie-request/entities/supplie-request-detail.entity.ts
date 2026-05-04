import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['reqId'])
@Entity('supplie_request_detail')
export class SupplieRequestDetail {
  @PrimaryGeneratedColumn({ name: 'rqd_id' })
  rqdId: number;

  @Column({ name: 'req_id', type: 'int' })
  reqId: number;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({
    name: 'req_qty',
    type: 'int',
    default: 1,
    comment: 'จำนวนที่ขอเบิก',
  })
  reqQty: number;

  @Column({
    name: 'issued_qty',
    type: 'int',
    default: 0,
    comment: 'จำนวนที่จ่ายจริง',
  })
  issuedQty: number;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
}
