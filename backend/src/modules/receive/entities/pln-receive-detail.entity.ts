import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pln_receive_detail')
export class PlnReceiveDetail {
  @PrimaryGeneratedColumn({ name: 'prd_id' })
  prdId: number;

  @Column({ name: 'pr_id', type: 'int' })
  prId: number;

  @Column({ name: 'bg_type_id', type: 'int', nullable: true })
  bgTypeId: number | null;

  @Column({ name: 'prd_detail', type: 'varchar', length: 45, nullable: true })
  prdDetail: string | null;

  @Column({ name: 'prd_budget', type: 'float', nullable: true })
  prdBudget: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'create_date', type: 'date', nullable: true })
  createDate: Date | null;

  @Column({ name: 'update_date', type: 'date', nullable: true })
  updateDate: Date | null;
}
