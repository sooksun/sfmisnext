import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashKeepingCommittee } from './entities/cash-keeping-committee.entity';
import { SaveCommitteeDto } from './dto/save-committee.dto';

@Injectable()
export class CashCommitteeService {
  constructor(
    @InjectRepository(CashKeepingCommittee)
    private readonly repo: Repository<CashKeepingCommittee>,
  ) {}

  async load(scId: number) {
    const rows = await this.repo.find({
      where: { scId, del: 0 },
      order: { role: 'ASC', seq: 'ASC' },
    });
    return rows.map((r) => ({
      ckc_id: r.ckcId,
      role: r.role,
      seq: r.seq,
      name: r.name,
      position: r.position,
      order_no: r.orderNo,
      order_date: r.orderDate,
    }));
  }

  /** แทนที่ทั้งชุด: ลบของเดิม (soft) แล้วบันทึกรายชื่อใหม่ */
  async save(dto: SaveCommitteeDto) {
    await this.repo.update(
      { scId: dto.sc_id, del: 0 },
      { del: 1, upBy: dto.up_by },
    );
    const entities = (dto.members ?? [])
      .filter((m) => (m.name ?? '').trim())
      .map((m) =>
        this.repo.create({
          scId: dto.sc_id,
          role: m.role === 'auditor' ? 'auditor' : 'keeper',
          seq: m.seq,
          name: m.name.trim(),
          position: m.position?.trim() || null,
          orderNo: m.order_no?.trim() || null,
          orderDate: m.order_date || null,
          upBy: dto.up_by,
          del: 0,
        }),
      );
    if (entities.length) await this.repo.save(entities);
    return { flag: true, ms: 'บันทึกรายชื่อกรรมการเรียบร้อยแล้ว' };
  }
}
