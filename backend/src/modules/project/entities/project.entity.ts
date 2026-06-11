import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'syId', 'del'])
@Entity('pln_project')
export class Project {
  @PrimaryGeneratedColumn({ name: 'proj_id' })
  projId: number;

  @Column({ name: 'proj_name', type: 'varchar', length: 255 })
  projName: string;

  @Column({ name: 'proj_detail', type: 'text', nullable: true })
  projDetail: string | null;

  /** สอดคล้องกับนโยบาย สพฐ (เช่น "ข้อ 3 เรื่อง ยกระดับคุณภาพการศึกษา") */
  @Column({ name: 'proj_policy', type: 'text', nullable: true })
  projPolicy: string | null;

  /** ประเภทงบประมาณที่ใช้ (เช่น เงินอุดหนุนรายหัว) */
  @Column({
    name: 'proj_budget_type',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  projBudgetType: string | null;

  /** ผู้รับผิดชอบโครงการ */
  @Column({ name: 'proj_owner', type: 'varchar', length: 150, nullable: true })
  projOwner: string | null;

  @Column({
    name: 'proj_budget',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  projBudget: number;

  @Column({ name: 'pbc_id', type: 'int', nullable: true })
  pbcId: number | null;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  /**
   * ฝ่ายงาน: 1=วิชาการ 2=บริหารทั่วไป 3=แผนและงบประมาณ 4=บุคคล
   * 5=งบประจำ 6=ปฐมวัย 7=สนับสนุนอบต./เทศบาล 8=สนับสนุนจากหน่วยงานอื่น
   */
  @Column({
    name: 'department',
    type: 'int',
    nullable: true,
    comment:
      '1=วิชาการ|2=บริหารทั่วไป|3=แผน/งบ|4=บุคคล|5=งบประจำ|6=ปฐมวัย|7=อบต.|8=อื่น',
  })
  department: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ name: 'proj_status', type: 'int', default: 0 })
  projStatus: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', nullable: true })
  updateDate: Date;
}
