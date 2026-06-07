import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// ชั้นเรียนที่โรงเรียนเปิดสอน — ใช้กรองชั้นในหน้าตั้งค่าเกณฑ์เงินต่อหัว/คำนวณ
@Index(['scId', 'del'])
@Entity('school_classroom')
export class SchoolClassroom {
  @PrimaryGeneratedColumn({ name: 'sc_class_id' })
  scClassId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @Column({
    name: 'is_open',
    type: 'tinyint',
    default: 1,
    comment: '1 = เปิดสอน | 0 = ไม่เปิดสอน',
  })
  isOpen: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
