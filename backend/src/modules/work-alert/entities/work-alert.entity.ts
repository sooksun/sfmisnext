import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ศูนย์การเตือนงานกลาง — ทุกชั้น (ปฏิทิน/ตรวจปิดวัน/ค่าผิดปกติ/guard/ai) เขียนลงที่เดียว
 * อ้างอิงออกแบบ: docs/DESIGN_alert_audit_system.md
 */
@Entity('work_alert')
@Index(['scId', 'status', 'del'])
@Index(['scId', 'ruleCode', 'period', 'del'], { unique: true })
export class WorkAlert {
  @PrimaryGeneratedColumn({ name: 'wa_id' }) waId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  /** calendar | daily_check | anomaly | guard | ai */
  @Column({ type: 'varchar', length: 20, default: 'calendar' })
  source: string;

  /** รหัสกฎ เช่น WHT_REMIT (ร่วมกับ period กันซ้ำ) */
  @Column({ name: 'rule_code', type: 'varchar', length: 40 })
  ruleCode: string;

  /** งวดของเตือน เช่น 2569-04 หรือ id ของ record — กัน insert ซ้ำงวดเดียวกัน */
  @Column({ type: 'varchar', length: 30, default: '-' })
  period: string;

  /** info | warning | error */
  @Column({ type: 'varchar', length: 10, default: 'warning' })
  severity: string;

  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) detail: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) link: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  /** roles ที่เกี่ยวข้อง (comma) เช่น "5,8" — กระดิ่งกรองตาม role */
  @Column({ name: 'assignee_role', type: 'varchar', length: 30, nullable: true })
  assigneeRole: string | null;

  /** 1=ใหม่ 2=รับทราบ 3=ทำแล้ว(auto-resolve) 4=หมดอายุ */
  @Column({ type: 'tinyint', default: 1, comment: '1=ใหม่|2=รับทราบ|3=ทำแล้ว|4=หมดอายุ' })
  status: number;

  @Column({ name: 'resolved_by', type: 'varchar', length: 20, nullable: true })
  resolvedBy: string | null;
  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'int', default: 0 }) del: number;
  @CreateDateColumn({ name: 'cre_date', type: 'datetime', nullable: true })
  creDate: Date | null;
  @UpdateDateColumn({ name: 'up_date', type: 'datetime', nullable: true })
  upDate: Date | null;
}
