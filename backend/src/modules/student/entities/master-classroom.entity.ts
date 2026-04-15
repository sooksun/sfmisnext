import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('master_classroom')
export class MasterClassroom {
  @PrimaryGeneratedColumn({ name: 'class_id' })
  classId: number;

  @Column({ name: 'class_lev', type: 'varchar', length: 50, nullable: true })
  classLev: string | null;
}
