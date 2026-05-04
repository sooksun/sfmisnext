import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * ทะเบียนหลัก (Main Register) — 31 ประเภทเงินนอกงบประมาณ
 * ใช้เป็น dropdown ในรายรับ/รายจ่าย/เงินยืม/เงินฝาก
 * category: 1=เงินอุดหนุน 2=รายได้สถานศึกษา 3=รายได้แผ่นดิน 4=เงินฝาก/ประกัน 5=ภาษีหักณที่จ่าย 6=ประกันสังคม 7=เรียนฟรี15ปี 8=อื่นๆ
 */
@Entity('main_register')
export class MainRegister {
  @PrimaryGeneratedColumn({ name: 'mr_id' }) mrId: number;
  @Column({ name: 'mr_code', type: 'varchar', length: 10, nullable: true })
  mrCode: string | null;
  @Column({ name: 'mr_name', type: 'varchar', length: 300 }) mrName: string;
  @Column({
    name: 'category',
    type: 'int',
    default: 1,
    comment:
      '1=อุดหนุน|2=รายได้สถานศึกษา|3=รายได้แผ่นดิน|4=เงินฝาก|5=ภาษี|6=ประกันสังคม|7=เรียนฟรี|8=อื่นๆ',
  })
  category: number;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', type: 'tinyint', default: 1 }) isActive: number;
}
