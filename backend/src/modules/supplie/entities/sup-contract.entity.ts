import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['orderId', 'del'])
@Entity('sup_contract')
export class SupContract {
  @PrimaryGeneratedColumn({ name: 'ct_id' })
  ctId: number;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'ct_no', type: 'varchar', length: 50, nullable: true })
  ctNo: string | null;

  @Column({
    name: 'ct_type',
    type: 'int',
    default: 1,
    comment: '1=ใบสั่งซื้อ 2=สัญญาจ้าง 3=ข้อตกลง',
  })
  ctType: number;

  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number | null;

  @Column({ name: 'ct_date', type: 'date', nullable: true })
  ctDate: Date | null;

  @Column({ name: 'ct_amount', type: 'float', default: 0 })
  ctAmount: number;

  @Column({ name: 'ct_vat', type: 'float', default: 0 })
  ctVat: number;

  @Column({ name: 'ct_total', type: 'float', default: 0 })
  ctTotal: number;

  @Column({ name: 'warranty_amount', type: 'float', default: 0 })
  warrantyAmount: number;

  @Column({
    name: 'warranty_type',
    type: 'int',
    default: 0,
    comment: '0=ไม่มี 1=เงินสด 2=หนังสือค้ำประกัน 3=พันธบัตร',
  })
  warrantyType: number;

  @Column({ name: 'warranty_return_dt', type: 'date', nullable: true })
  warrantyReturnDt: Date | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({
    name: 'ct_status',
    type: 'int',
    default: 0,
    comment: '0=ร่าง 1=ลงนาม 2=ส่งมอบครบ 3=ปิด 9=ยกเลิก',
  })
  ctStatus: number;

  @Column({
    name: 'product_warranty_months',
    type: 'int',
    default: 0,
    comment: 'รับประกันสินค้า (เดือน)',
  })
  productWarrantyMonths: number;

  @Column({
    name: 'warranty_start_date',
    type: 'date',
    nullable: true,
    comment: 'วันเริ่มรับประกันสินค้า',
  })
  warrantyStartDate: Date | null;

  @Column({
    name: 'warranty_end_date',
    type: 'date',
    nullable: true,
    comment: 'วันหมดรับประกันสินค้า',
  })
  warrantyEndDate: Date | null;

  @Column({ name: 'ct_file', type: 'varchar', length: 255, nullable: true })
  ctFile: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
