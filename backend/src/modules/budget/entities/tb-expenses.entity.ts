import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_expenses')
export class TbExpenses {
  @PrimaryGeneratedColumn({ name: 'ex_id' })
  exId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'ex_year_in', type: 'int', nullable: true })
  exYearIn: number | null;

  @Column({ name: 'bg_type_id', type: 'int', nullable: true })
  bgTypeId: number | null;

  @Column({ name: 'ex_type_budget', type: 'int', nullable: true })
  exTypeBudget: number | null; // 0 = ยอดยกมาจากปีงบประมาณก่อน | 1 = รับจากปีงบประมาณปัจจุบัน

  @Column({ name: 'p_id', type: 'int', nullable: true })
  pId: number | null;

  @Column({ name: 'ex_year_out', type: 'int', nullable: true })
  exYearOut: number | null; // ปีงบประมาณที่จ่าย

  @Column({ name: 'ex_remark', type: 'text', nullable: true })
  exRemark: string | null;

  @Column({ name: 'ex_money', type: 'float', default: 0 })
  exMoney: number;

  @Column({ name: 'ex_status', type: 'int', default: 0 })
  exStatus: number; // 0 = รออนุมัติ

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
