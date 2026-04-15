import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parcel_detail')
export class ParcelDetail {
  @PrimaryGeneratedColumn({ name: 'pc_id' })
  pcId: number;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({ name: 'pc_total', type: 'int', nullable: true })
  pcTotal: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
