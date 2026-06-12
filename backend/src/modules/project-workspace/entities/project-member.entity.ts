import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * สมาชิกโครงการ — แยกจาก tb_admin.type (สิทธิ์ระดับโครงการ ไม่อิง role ระบบ)
 * หนึ่งโครงการมีเจ้าของ (owner) ได้ 1 คน, member/reviewer ได้หลายคน
 */
@Index(['projectId', 'del'])
@Index(['projectId', 'adminId', 'projectRole', 'del'], { unique: true })
@Entity('pln_project_member')
export class ProjectMember {
  @PrimaryGeneratedColumn({ name: 'member_id' })
  memberId: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId: number;

  @Column({ name: 'admin_id', type: 'int' })
  adminId: number;

  /** บทบาทในโครงการ: owner | member | reviewer */
  @Column({
    name: 'project_role',
    type: 'varchar',
    length: 20,
    default: 'member',
    comment: 'owner | member | reviewer',
  })
  projectRole: string;

  /** ชื่อบทบาทในโครงการ (อิสระจาก role ระบบ) เช่น "ผู้ประสานงาน" */
  @Column({ name: 'role_name', type: 'varchar', length: 150, nullable: true })
  roleName: string | null;

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
