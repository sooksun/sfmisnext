import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * บันทึกการรับรอง/ลงนามรายงานการเงิน
 * ตามระเบียบกระทรวงการคลัง พ.ศ. 2562:
 *   - รายวัน: เจ้าหน้าที่การเงินรับรองยอดเงินคงเหลือประจำวัน
 *   - รายเดือน: ผู้อำนวยการโรงเรียนลงนามรับรองรายงานประจำเดือน
 */
@Entity('financial_audit_log')
export class FinancialAuditLog {
  @PrimaryGeneratedColumn({ name: 'fal_id' })
  falId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'sy_id', type: 'int', default: 0 })
  syId: number;

  @Column({
    name: 'audit_type',
    type: 'int',
    default: 1,
    comment: '1 = รายวัน | 2 = รายเดือน',
  })
  auditType: number;

  /**
   * บทบาทผู้ลงนาม (ตามระเบียบ กค. 2562 ข้อ 3.2 + ข้อ 5):
   * 1 = เจ้าหน้าที่การเงิน (ผู้จัดทำ)
   * 2 = คณะกรรมการตรวจสอบการรับ-จ่ายเงินประจำวัน
   * 3 = ผู้อำนวยการโรงเรียน (ผู้สอบทาน ณ สิ้นเดือน)
   */
  @Column({
    name: 'signer_role',
    type: 'int',
    default: 1,
    comment: '1=finance, 2=committee, 3=director',
  })
  signerRole: number;

  @Column({
    name: 'audit_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่รับรอง (สำหรับ audit_type=1)',
  })
  auditDate: string | null;

  @Column({
    name: 'audit_month',
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'เดือนที่รับรอง YYYY-MM (สำหรับ audit_type=2)',
  })
  auditMonth: string | null;

  @Column({
    name: 'signed_by',
    type: 'int',
    default: 0,
    comment: 'admin_id ของผู้ลงนาม',
  })
  signedBy: number;

  @Column({
    name: 'signed_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อ-สกุลผู้ลงนาม ณ เวลาลงนาม',
  })
  signedName: string | null;

  @Column({
    name: 'signed_position',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ตำแหน่งผู้ลงนาม',
  })
  signedPosition: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({
    name: 'snapshot_json',
    type: 'longtext',
    nullable: true,
    comment: 'snapshot ยอดรวม ณ เวลาลงนาม (JSON) สำหรับ audit trail',
  })
  snapshotJson: string | null;

  @Column({
    name: 'snapshot_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'SHA-256 hash ของ snapshot สำหรับตรวจความถูกต้อง',
  })
  snapshotHash: string | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
