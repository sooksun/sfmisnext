import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_partner')
export class Partner {
  @PrimaryGeneratedColumn({ name: 'p_id' })
  pId: number;

  @Column({ name: 'p_type', type: 'int', default: 1 })
  pType: number; // 1 = บุคคลธรรมดา, 2 = นิติบุคคล

  @Column({ name: 'p_no', type: 'varchar', length: 45, nullable: true })
  pNo: string | null;

  @Column({ name: 'p_name', type: 'varchar', length: 250 })
  pName: string;

  @Column({ name: 'pay_type', type: 'int', default: 1 })
  payType: number; // 1 = บุคคลภายใน, 2 = บุคคลภายนอก

  @Column({ name: 'payee', type: 'varchar', length: 250, nullable: true })
  payee: string | null; // ชื่อผู้มีอำนาจรับเงิน

  @Column({ name: 'p_address', type: 'text', nullable: true })
  pAddress: string | null;

  @Column({ name: 'p_phone', type: 'varchar', length: 100, nullable: true })
  pPhone: string | null;

  @Column({ name: 'p_tel', type: 'varchar', length: 100, nullable: true })
  pTel: string | null;

  @Column({ name: 'p_fax', type: 'varchar', length: 100, nullable: true })
  pFax: string | null;

  @Column({ name: 'p_id_tax', type: 'varchar', length: 45, nullable: true })
  pIdTax: string | null;

  @Column({ name: 'p_tax', type: 'varchar', length: 45, nullable: true })
  pTax: string | null;

  @Column({ name: 'cal_vat', type: 'int', default: 2 })
  calVat: number; // 2 = บุคคลภายใน, 1 = คำนวน, 0 = ไม่คำนวน

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ type: 'int', default: 0 })
  del: number; // 0 = active, 1 = delete

  @Column({ name: 'cre_by', type: 'int', nullable: true })
  creBy: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
