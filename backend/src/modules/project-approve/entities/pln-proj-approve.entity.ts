import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_proj_approve')
export class PlnProjApprove {
  @PrimaryGeneratedColumn({ name: 'ppa_id' })
  ppaId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'acad_year', type: 'int' })
  acadYear: number;

  @Column({ name: 'proj_id', type: 'int' })
  projId: number;

  @Column({ type: 'int' })
  numbers: number;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'varchar', length: 125 })
  resources: string;

  @Column({ name: 'total_budgets', type: 'float' })
  totalBudgets: number;

  @Column({ type: 'float' })
  budgets: number;

  @Column({ name: 'remaind_budgets', type: 'float' })
  remaindBudgets: number;

  @Column({ name: 'operate_date', type: 'date' })
  operateDate: Date;

  @Column({ name: 'job_type', type: 'int' })
  jobType: number;

  @Column({ name: 'note_number', type: 'int' })
  noteNumber: number;

  @Column({ name: 'buy_date', type: 'date' })
  buyDate: Date;

  @Column({ name: 'buy_reason', type: 'varchar', length: 255 })
  buyReason: string;

  @Column({ type: 'int' })
  departments: number;

  @Column({ name: 'due_date', type: 'int' })
  dueDate: number;

  @Column({ type: 'varchar', length: 255 })
  committee1: string;

  @Column({ type: 'varchar', length: 255 })
  committee2: string;

  @Column({ type: 'varchar', length: 255 })
  committee3: string;

  @Column({ name: 'book_order_committee', type: 'varchar', length: 50 })
  bookOrderCommittee: string;

  @Column({ name: 'date_order_committee', type: 'date' })
  dateOrderCommittee: Date;

  @Column({ name: 'book_report_number', type: 'varchar', length: 100 })
  bookReportNumber: string;

  @Column({ name: 'date_book_report', type: 'varchar', length: 100 })
  dateBookReport: string;

  @Column({ type: 'bigint' })
  suppliers: number;

  @Column({ name: 'present_cost', type: 'float' })
  presentCost: number;

  @Column({ name: 'date_win', type: 'date' })
  dateWin: Date;

  @Column({ name: 'number_orders', type: 'varchar', length: 100 })
  numberOrders: string;

  @Column({ name: 'orders_date', type: 'date' })
  ordersDate: Date;

  @Column({ name: 'due_orders_date', type: 'int' })
  dueOrdersDate: number;

  @Column({ name: 'over_due_date', type: 'date' })
  overDueDate: Date;

  @Column({ name: 'prove_date', type: 'date' })
  proveDate: Date;

  @Column({ name: 'number_report_widdraw', type: 'varchar', length: 100 })
  numberReportWiddraw: string;

  @Column({ name: 'date_report_widdraw', type: 'date' })
  dateReportWiddraw: Date;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
