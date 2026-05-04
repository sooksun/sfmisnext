import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * คณะกรรมการตรวจรับพัสดุ/ตรวจรับงานจ้าง
 * ต้องระบุเมื่อออกเช็คจำนวนเงิน > 5,000 บาท
 * (ตามระเบียบกระทรวงการคลัง ว่าด้วยการจัดซื้อจัดจ้าง)
 */
@Index(['scId', 'del'])
@Entity('check_receive_committee')
export class CheckReceiveCommittee {
  @PrimaryGeneratedColumn({ name: 'crc_id' })
  crcId: number;

  @Column({
    name: 'rw_id',
    type: 'int',
    unique: true,
    comment: 'FK → request_withdraw.rw_id',
  })
  rwId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  // ── กรรมการคนที่ 1 ──────────────────────────────────────────────────────
  @Column({
    name: 'member1_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member1Name: string | null;

  @Column({
    name: 'member1_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member1Position: string | null;

  // ── กรรมการคนที่ 2 ──────────────────────────────────────────────────────
  @Column({
    name: 'member2_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member2Name: string | null;

  @Column({
    name: 'member2_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member2Position: string | null;

  // ── กรรมการคนที่ 3 ──────────────────────────────────────────────────────
  @Column({
    name: 'member3_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member3Name: string | null;

  @Column({
    name: 'member3_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  member3Position: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
