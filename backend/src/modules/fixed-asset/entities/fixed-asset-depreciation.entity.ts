import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['faId', 'budgetYear'])
@Entity('tb_fixed_asset_depreciation')
export class FixedAssetDepreciation {
  @PrimaryGeneratedColumn({ name: 'fad_id' })
  fadId: number;

  @Column({ name: 'fa_id', type: 'int' })
  faId: number;

  @Column({ name: 'budget_year', type: 'int', comment: 'ปีงบประมาณ พ.ศ.' })
  budgetYear: number;

  @Column({
    name: 'depreciation_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  depreciationAmount: number;

  @Column({
    name: 'book_value_end',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  bookValueEnd: number;

  @Column({ name: 'calc_date', type: 'date', nullable: true })
  calcDate: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
}
