import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['rwId', 'del'])
@Entity('tb_invoice_pre_audit')
export class InvoicePreAudit {
  @PrimaryGeneratedColumn({ name: 'ipa_id' })
  ipaId: number;

  @Column({ name: 'rw_id', type: 'int', comment: 'RequestWithdraw.rw_id' })
  rwId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'auditor_id', type: 'int' })
  auditorId: number;

  @Column({
    name: 'auditor_name',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  auditorName: string | null;

  @Column({ name: 'audit_date', type: 'date' })
  auditDate: string;

  @Column({
    name: 'result',
    type: 'tinyint',
    comment: '1=ผ่าน 2=ส่งคืนแก้ไข 3=ไม่ผ่าน',
  })
  result: number;

  @Column({
    name: 'checklist',
    type: 'text',
    nullable: true,
    comment: 'JSON รายการที่ตรวจ',
  })
  checklist: string | null;

  @Column({ name: 'issues', type: 'text', nullable: true })
  issues: string | null;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
}
