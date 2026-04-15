import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bank_db')
export class BankDb {
  @PrimaryGeneratedColumn({ name: 'b_id' })
  bId: number;

  @Column({ name: 'b_name_l', type: 'varchar', length: 255, nullable: true })
  bNameL: string | null;

  @Column({ name: 'b_name_s', type: 'varchar', length: 45, nullable: true })
  bNameS: string | null;

  @Column({ name: 'b_img', type: 'text', nullable: true })
  bImg: string | null;
}
