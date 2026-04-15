import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('submitting_student_records')
export class SubmittingStudentRecords {
  @PrimaryGeneratedColumn({ name: 'ssr_id' })
  ssrId: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '0 = กำลังดำเนินการ, 100 = ส่งเรื่องปิดแก้ไข',
  })
  status: number;

  @Column({ name: 'sy_id', type: 'int', default: 0 })
  syId: number;

  @Column({ type: 'int', default: 0 })
  year: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
