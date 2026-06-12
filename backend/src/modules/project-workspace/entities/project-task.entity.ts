import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * งานย่อยของโครงการ (Kanban task)
 * progress โครงการ = Σweight(เสร็จแล้ว) / Σweight(ไม่ยกเลิก) × 100
 */
@Index(['projectId', 'del'])
@Index(['assigneeAdminId', 'status', 'del'])
@Entity('pln_project_task')
export class ProjectTask {
  @PrimaryGeneratedColumn({ name: 'task_id' })
  taskId: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId: number;

  @Column({ name: 'task_no', type: 'int', default: 0 })
  taskNo: number;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'detail', type: 'text', nullable: true })
  detail: string | null;

  @Column({ name: 'assignee_admin_id', type: 'int', nullable: true })
  assigneeAdminId: number | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  /** 1=ยังไม่เริ่ม 2=กำลังทำ 3=รอตรวจ 4=เสร็จแล้ว 5=ติดขัด 9=ยกเลิก */
  @Column({
    name: 'status',
    type: 'tinyint',
    default: 1,
    comment: '1=ยังไม่เริ่ม 2=กำลังทำ 3=รอตรวจ 4=เสร็จแล้ว 5=ติดขัด 9=ยกเลิก',
  })
  status: number;

  /** น้ำหนักงาน 1-100 (ไม่ระบุ = 1 กระจายเท่ากัน) */
  @Column({ name: 'weight', type: 'int', default: 1 })
  weight: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** 1 = ต้องมีหลักฐานก่อนปิดงานเป็น "เสร็จแล้ว" */
  @Column({ name: 'evidence_required', type: 'tinyint', default: 0 })
  evidenceRequired: number;

  @Column({ name: 'result_note', type: 'text', nullable: true })
  resultNote: string | null;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason: string | null;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: string | null;

  @Column({ name: 'completed_by', type: 'int', nullable: true })
  completedBy: number | null;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
