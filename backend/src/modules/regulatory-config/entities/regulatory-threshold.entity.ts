import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * regulatory_threshold
 * เกณฑ์/วงเงินตามระเบียบที่ "ตั้งค่าได้" รายโรงเรียน
 *  - sc_id = 0  → ค่า override ระดับ global (ใช้กับทุกโรงเรียนที่ไม่ได้ตั้งเอง)
 *  - sc_id > 0  → ค่าเฉพาะโรงเรียนนั้น (ลำดับความสำคัญสูงสุด)
 * ถ้าไม่มีแถวเลย → ใช้ค่า default ใน regulatory-config.defaults.ts
 */
@Index(['scId', 'configKey', 'del'])
@Entity('regulatory_threshold')
export class RegulatoryThreshold {
  @PrimaryGeneratedColumn({ name: 'rt_id' }) rtId: number;

  @Column({
    name: 'sc_id',
    type: 'int',
    default: 0,
    comment: '0=global override',
  })
  scId: number;

  @Column({ name: 'config_key', type: 'varchar', length: 64 })
  configKey: string;

  @Column({ type: 'float', default: 0, comment: 'ค่าเกณฑ์' })
  value: number;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'หน่วย' })
  unit: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
