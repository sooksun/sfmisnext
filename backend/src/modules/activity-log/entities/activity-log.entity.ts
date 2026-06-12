import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * บันทึกกิจกรรมกลาง — ทุกการเขียนข้อมูล (create/update/delete/approve/confirm/export/login)
 * ถูกดักโดย ActivityLogInterceptor อัตโนมัติ (ดู docs/DESIGN_alert_audit_system.md ชั้น 4)
 * เป็น layer หยาบครอบทั้งระบบ — ส่วน delete-log/financial-audit เดิมเป็น layer ลึกเฉพาะทาง
 */
@Entity('activity_log')
@Index(['scId', 'creDate'])
@Index(['adminId', 'creDate'])
@Index(['module', 'entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn({ name: 'al_id', type: 'bigint' }) alId: string;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'admin_id', type: 'int', default: 0 }) adminId: number;
  @Column({ name: 'admin_name', type: 'varchar', length: 150, nullable: true })
  adminName: string | null;
  @Column({ type: 'int', default: 0 }) role: number;

  /** create | update | delete | approve | confirm | export | login | action */
  @Column({ type: 'varchar', length: 20 }) action: string;

  /** controller prefix เช่น Loan_agreement */
  @Column({ type: 'varchar', length: 60, nullable: true }) module: string | null;
  @Column({ type: 'varchar', length: 8, nullable: true }) method: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) route: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 60, nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true }) summary: string | null;

  /** payload ที่ส่งมา (ลบ field อ่อนไหว + ตัดความยาว) — สำหรับโมดูลการเงิน */
  @Column({ name: 'detail_json', type: 'text', nullable: true })
  detailJson: string | null;

  @Column({ type: 'tinyint', default: 1 }) success: number;

  @Column({ type: 'varchar', length: 45, nullable: true }) ip: string | null;
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'cre_date', type: 'datetime', nullable: true })
  creDate: Date | null;
}
