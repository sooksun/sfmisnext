import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('receive_parcel_detail')
export class ReceiveParcelDetail {
  @PrimaryGeneratedColumn({ name: 'rp_id' })
  rpId: number;

  @Column({ name: 'receive_id', type: 'int', nullable: true })
  receiveId: number | null;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({ name: 'rp_total', type: 'int', nullable: true })
  rpTotal: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
