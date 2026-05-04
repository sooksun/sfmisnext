import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'del'])
@Index(['scId', 'faCode'])
@Entity('tb_fixed_asset')
export class FixedAsset {
  @PrimaryGeneratedColumn({ name: 'fa_id' })
  faId: number;

  @Column({
    name: 'fa_code',
    type: 'varchar',
    length: 100,
    comment: 'เลขครุภัณฑ์',
  })
  faCode: string;

  @Column({ name: 'fa_name', type: 'varchar', length: 250 })
  faName: string;

  @Column({
    name: 'fa_category',
    type: 'tinyint',
    default: 1,
    comment: '1=สำนักงาน 2=คอมพิวเตอร์ 3=ยานพาหนะ 4=การศึกษา 5=อื่นๆ',
  })
  faCategory: number;

  @Column({ name: 'fa_detail', type: 'text', nullable: true })
  faDetail: string | null;

  @Column({ name: 'fa_brand', type: 'varchar', length: 120, nullable: true })
  faBrand: string | null;

  @Column({ name: 'fa_model', type: 'varchar', length: 120, nullable: true })
  faModel: string | null;

  @Column({
    name: 'fa_serial_no',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  faSerialNo: string | null;

  @Column({ name: 'acquired_date', type: 'date', nullable: true })
  acquiredDate: string | null;

  @Column({
    name: 'acquired_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  acquiredPrice: number;

  @Column({ name: 'useful_life_years', type: 'int', default: 5 })
  usefulLifeYears: number;

  @Column({
    name: 'depreciation_method',
    type: 'tinyint',
    default: 1,
    comment: '1=straight-line',
  })
  depreciationMethod: number;

  @Column({
    name: 'salvage_value',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 1,
  })
  salvageValue: number;

  @Column({
    name: 'accumulated_depreciation',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  accumulatedDepreciation: number;

  @Column({ name: 'location', type: 'varchar', length: 250, nullable: true })
  location: string | null;

  @Column({ name: 'responsible_admin_id', type: 'int', nullable: true })
  responsibleAdminId: number | null;

  @Column({
    name: 'responsible_name',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  responsibleName: string | null;

  @Column({
    name: 'source',
    type: 'tinyint',
    default: 1,
    comment: '1=งบประมาณ 2=เงินรายได้ 3=บริจาค 4=โอนมา',
  })
  source: number;

  @Column({ name: 'parcel_order_id', type: 'int', nullable: true })
  parcelOrderId: number | null;

  @Column({ name: 'receive_parcel_order_id', type: 'int', nullable: true })
  receiveParcelOrderId: number | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 1,
    comment: '1=ใช้งาน 2=ชำรุด 3=ซ่อม 4=จำหน่าย 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'disposal_id', type: 'int', nullable: true })
  disposalId: number | null;

  @Column({
    name: 'warranty_end_date',
    type: 'date',
    nullable: true,
    comment: 'วันหมดรับประกันครุภัณฑ์',
  })
  warrantyEndDate: Date | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
