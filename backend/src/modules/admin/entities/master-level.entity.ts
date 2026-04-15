import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('master_level')
export class MasterLevel {
  @PrimaryGeneratedColumn({ name: 'lev_id' })
  levId: number;

  @Column({ type: 'varchar', length: 255 })
  level: string;

  @Column({ type: 'varchar', length: 255 })
  position: string;
}
