import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parcel_order')
export class ParcelOrder {
  @PrimaryGeneratedColumn({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @Column({
    name: 'project_type',
    type: 'int',
    default: 1,
    comment: '1 = จัดซื้อ | 2 = จัดจ้าง',
  })
  projectType: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'bg_type_id', type: 'int', default: 0 })
  bgTypeId: number;

  @Column({ name: 'admin_id', type: 'int', nullable: true })
  adminId: number | null;

  @Column({ name: 'order_date', type: 'datetime', nullable: true })
  orderDate: Date | null;

  @Column({
    name: 'order_status',
    type: 'int',
    default: 1,
    comment:
      '0 = ทบทวนใหม่ |1 = ขอ |2 = แผน|3 = การเงิน|4 = พัสดุ|5 = ผอ.|6 = ตั้งกรรมการ|7 = จัดซื้อ | 8 = สำเร็จ',
  })
  orderStatus: number;

  @Column({ type: 'text', nullable: true, comment: 'หมายเหตุหากไม่อนุมัติ' })
  remark: string | null;

  @Column({ name: 'remark_cf_plan', type: 'text', nullable: true })
  remarkCfPlan: string | null;

  @Column({ name: 'remark_cf_business', type: 'text', nullable: true })
  remarkCfBusiness: string | null;

  @Column({ name: 'remark_cf_suppile', type: 'text', nullable: true })
  remarkCfSuppile: string | null;

  @Column({ name: 'remark_cf_ceo', type: 'text', nullable: true })
  remarkCfCeo: string | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;

  @Column({ name: 'operate_date', type: 'date', nullable: true })
  operateDate: Date | null;

  @Column({ name: 'acad_year', type: 'int', nullable: true })
  acadYear: number | null;

  @Column({ type: 'int', nullable: true })
  numbers: number | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ name: 'p_id', type: 'int', default: 0 })
  pId: number;

  @Column({ type: 'int', default: 0 })
  resources: number;

  @Column({ type: 'float', nullable: true })
  budgets: number | null;

  @Column({ name: 'job_type', type: 'int', nullable: true })
  jobType: number | null;

  @Column({ name: 'note_number', type: 'int', nullable: true })
  noteNumber: number | null;

  @Column({ name: 'buy_date', type: 'date', nullable: true })
  buyDate: Date | null;

  @Column({ name: 'buy_reason', type: 'varchar', length: 255, nullable: true })
  buyReason: string | null;

  @Column({ type: 'int', nullable: true })
  departments: number | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'int', default: 0 })
  committee1: number;

  @Column({ type: 'int', default: 0 })
  committee2: number;

  @Column({ type: 'int', default: 0 })
  committee3: number;

  @Column({ name: 'date_deadline', type: 'datetime', nullable: true })
  dateDeadline: Date | null;

  @Column({ name: 'day_deadline', type: 'int', default: 1 })
  dayDeadline: number;

  @Column({
    name: 'book_order_committee',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bookOrderCommittee: string | null;

  @Column({ name: 'date_order_committee', type: 'date', nullable: true })
  dateOrderCommittee: Date | null;

  @Column({
    name: 'book_report_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bookReportNumber: string | null;

  @Column({
    name: 'date_book_report',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  dateBookReport: string | null;

  @Column({ type: 'bigint', nullable: true })
  suppliers: number | null;

  @Column({ name: 'present_cost', type: 'float', nullable: true })
  presentCost: number | null;

  @Column({ name: 'date_win', type: 'date', nullable: true })
  dateWin: Date | null;

  @Column({
    name: 'number_orders',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  numberOrders: string | null;

  @Column({ name: 'orders_date', type: 'date', nullable: true })
  ordersDate: Date | null;

  @Column({ name: 'due_orders_date', type: 'int', nullable: true })
  dueOrdersDate: number | null;

  @Column({ name: 'over_due_date', type: 'date', nullable: true })
  overDueDate: Date | null;

  @Column({ name: 'prove_date', type: 'date', nullable: true })
  proveDate: Date | null;

  @Column({
    name: 'number_report_widdraw',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  numberReportWiddraw: string | null;

  @Column({ name: 'date_report_widdraw', type: 'date', nullable: true })
  dateReportWiddraw: Date | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;
}
