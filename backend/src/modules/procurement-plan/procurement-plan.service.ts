import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlnProcurementPlan } from './entities/pln-procurement-plan.entity';
import { PlnProcurementPlanItem } from './entities/pln-procurement-plan-item.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import {
  AddPlanDto,
  UpdatePlanDto,
  AnnouncePlanDto,
  AddPlanItemDto,
  UpdatePlanItemDto,
} from './dto/procurement-plan.dto';
import { type JwtUser } from '../../common/utils/tenant-guard';

const ORDER_STATUS: Record<number, string> = {
  0: 'ทบทวนใหม่',
  1: 'ขอ',
  2: 'แผน',
  3: 'การเงิน',
  4: 'พัสดุ',
  5: 'ผอ.',
  6: 'ตั้งกรรมการ',
  7: 'จัดซื้อ',
  8: 'สำเร็จ',
  9: 'ยกเลิก',
};
const METHOD_TYPE: Record<number, string> = {
  1: 'e-bidding',
  2: 'คัดเลือก',
  3: 'เฉพาะเจาะจง',
  4: 'ตลาด',
};

@Injectable()
export class ProcurementPlanService {
  constructor(
    @InjectRepository(PlnProcurementPlan)
    private readonly planRepo: Repository<PlnProcurementPlan>,
    @InjectRepository(PlnProcurementPlanItem)
    private readonly itemRepo: Repository<PlnProcurementPlanItem>,
    @InjectRepository(ParcelOrder)
    private readonly orderRepo: Repository<ParcelOrder>,
  ) {}

  async loadPlan(scId: number, acadYear: number) {
    const data = await this.planRepo
      .createQueryBuilder('p')
      .where('p.del = 0')
      .andWhere('p.sc_id = :scId', { scId })
      .andWhere('p.acad_year = :acadYear', { acadYear })
      .orderBy('p.pp_id', 'DESC')
      .getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async loadPlanDetail(ppId: number, user: JwtUser) {
    const plan = await this.planRepo.findOne({ where: { ppId, del: 0 } });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถดูข้อมูลของโรงเรียนอื่นได้');
    }
    const items = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.del = 0')
      .andWhere('i.pp_id = :ppId', { ppId })
      .orderBy('i.ppi_id', 'ASC')
      .getMany();
    return {
      data: { plan, items },
      count: items.length,
      page: 1,
      pageSize: items.length,
    };
  }

  async addPlan(dto: AddPlanDto) {
    const row = this.planRepo.create({
      scId: dto.sc_id,
      acadYear: dto.acad_year,
      ppNo: dto.pp_no ?? null,
      ppTitle: dto.pp_title ?? null,
      ppTotalBudget: dto.pp_total_budget ?? 0,
      ppSource: dto.pp_source ?? null,
      remark: dto.remark ?? null,
      ppStatus: 0,
      upBy: dto.up_by ?? 0,
    });
    await this.planRepo.save(row);

    // ผูกกับ parcel_order ถ้ามี — สร้างรายการในแผนพร้อมโยง ppi_id กลับเพื่อให้
    // ผ่าน assertProcurementCompliant ในขั้นหัวหน้าพัสดุของ workflow อนุมัติ (1.3)
    let ppiId: number | null = null;
    if (dto.order_id) {
      const order = await this.orderRepo.findOne({
        where: { orderId: dto.order_id, del: 0 },
      });
      if (order) {
        const orderBudget = Number(order.budgets ?? 0);
        const item = this.itemRepo.create({
          ppId: row.ppId,
          projectId: order.projectId ?? null,
          itemTitle: order.details ?? dto.pp_title ?? null,
          itemBudget: orderBudget,
          methodType: order.methodType ?? 3,
          upBy: dto.up_by ?? 0,
        });
        await this.itemRepo.save(item);
        ppiId = item.ppiId;
        order.ppiId = item.ppiId;
        order.upBy = dto.up_by ?? order.upBy;
        await this.orderRepo.save(order);

        // sync วงเงินแผนให้ครอบคลุมรายการเสมอ — กันยอดรวมเกินวงเงินตอนประกาศ
        if (orderBudget > Number(row.ppTotalBudget)) {
          row.ppTotalBudget = orderBudget;
          await this.planRepo.save(row);
        }
      }
    }

    return { flag: true, ms: 'บันทึกสำเร็จ', pp_id: row.ppId, ppi_id: ppiId };
  }

  async updatePlan(dto: UpdatePlanDto, user: JwtUser) {
    const plan = await this.planRepo.findOne({
      where: { ppId: dto.pp_id, del: 0 },
    });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถแก้ไขข้อมูลของโรงเรียนอื่นได้');
    }
    if (plan.ppStatus === 1)
      throw new BadRequestException('แผนประกาศแล้ว แก้ไขไม่ได้');
    Object.assign(plan, {
      ppNo: dto.pp_no ?? plan.ppNo,
      ppTitle: dto.pp_title ?? plan.ppTitle,
      ppTotalBudget: dto.pp_total_budget ?? plan.ppTotalBudget,
      ppSource: dto.pp_source ?? plan.ppSource,
      // M7: คง remark เดิมถ้า dto.remark เป็น undefined (ป้องกัน remark หายตอน openEdit)
      remark: dto.remark !== undefined ? dto.remark : plan.remark,
      upBy: dto.up_by ?? plan.upBy,
    });
    await this.planRepo.save(plan);
    return { flag: true, ms: 'อัปเดตสำเร็จ' };
  }

  async removePlan(ppId: number, upBy: number, user: JwtUser) {
    const plan = await this.planRepo.findOne({ where: { ppId, del: 0 } });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถลบข้อมูลของโรงเรียนอื่นได้');
    }
    if (plan.ppStatus === 1)
      throw new BadRequestException('แผนประกาศแล้ว ลบไม่ได้');
    plan.del = 1;
    plan.upBy = upBy || plan.upBy;
    await this.planRepo.save(plan);
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  async announcePlan(dto: AnnouncePlanDto, user: JwtUser) {
    const plan = await this.planRepo.findOne({
      where: { ppId: dto.pp_id, del: 0 },
    });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException(
        'ไม่สามารถดำเนินการข้อมูลของโรงเรียนอื่นได้',
      );
    }
    const items = await this.itemRepo.find({
      where: { ppId: plan.ppId, del: 0 },
    });
    const sumItem = items.reduce((a, b) => a + Number(b.itemBudget || 0), 0);
    if (sumItem > Number(plan.ppTotalBudget)) {
      throw new BadRequestException(
        `ยอดรวมรายการ (${sumItem}) เกินวงเงินแผน (${plan.ppTotalBudget})`,
      );
    }
    plan.ppStatus = 1;
    plan.announceDate = dto.announce_date
      ? new Date(dto.announce_date)
      : new Date();
    plan.announceUrl = dto.announce_url ?? plan.announceUrl;
    plan.upBy = dto.up_by || plan.upBy;
    await this.planRepo.save(plan);
    return { flag: true, ms: 'ประกาศแผนสำเร็จ' };
  }

  async loadAvailablePlan(scId: number, acadYear: number) {
    const data = await this.planRepo
      .createQueryBuilder('p')
      .where('p.del = 0')
      .andWhere('p.pp_status = 1')
      .andWhere('p.sc_id = :scId', { scId })
      .andWhere('p.acad_year = :acadYear', { acadYear })
      .getMany();
    return { data, count: data.length, page: 1, pageSize: data.length };
  }

  async addPlanItem(dto: AddPlanItemDto, user: JwtUser) {
    const plan = await this.planRepo.findOne({
      where: { ppId: dto.pp_id, del: 0 },
    });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถแก้ไขข้อมูลของโรงเรียนอื่นได้');
    }
    if (plan.ppStatus === 1)
      throw new BadRequestException('แผนประกาศแล้ว เพิ่มรายการไม่ได้');

    // M8: ตรวจ sum รายการไม่เกินวงเงินแผน (ทำตั้งแต่ addItem ไม่รอจน announce)
    if (dto.item_budget && dto.item_budget > 0) {
      const existingItems = await this.itemRepo.find({
        where: { ppId: dto.pp_id, del: 0 },
      });
      const currentSum = existingItems.reduce(
        (a, b) => a + Number(b.itemBudget || 0),
        0,
      );
      if (currentSum + dto.item_budget > Number(plan.ppTotalBudget)) {
        throw new BadRequestException(
          `ยอดรวมรายการ (${currentSum + dto.item_budget}) จะเกินวงเงินแผน (${plan.ppTotalBudget})`,
        );
      }
    }

    const row = this.itemRepo.create({
      ppId: dto.pp_id,
      projectId: dto.project_id ?? null,
      itemTitle: dto.item_title ?? null,
      itemBudget: dto.item_budget ?? 0,
      buyMonth: dto.buy_month ?? null,
      methodType: dto.method_type ?? 3,
      remark: dto.remark ?? null,
      upBy: dto.up_by ?? 0,
    });
    await this.itemRepo.save(row);
    return { flag: true, ms: 'เพิ่มรายการสำเร็จ', ppi_id: row.ppiId };
  }

  async updatePlanItem(dto: UpdatePlanItemDto, user: JwtUser) {
    const item = await this.itemRepo.findOne({
      where: { ppiId: dto.ppi_id, del: 0 },
    });
    if (!item) throw new NotFoundException('ไม่พบรายการ');
    const plan = await this.planRepo.findOne({
      where: { ppId: item.ppId, del: 0 },
    });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถแก้ไขข้อมูลของโรงเรียนอื่นได้');
    }
    if (plan.ppStatus === 1)
      throw new BadRequestException('แผนประกาศแล้ว แก้ไขรายการไม่ได้');
    Object.assign(item, {
      projectId: dto.project_id ?? item.projectId,
      itemTitle: dto.item_title ?? item.itemTitle,
      itemBudget: dto.item_budget ?? item.itemBudget,
      buyMonth: dto.buy_month ?? item.buyMonth,
      methodType: dto.method_type ?? item.methodType,
      remark: dto.remark ?? item.remark,
      upBy: dto.up_by ?? item.upBy,
    });
    await this.itemRepo.save(item);
    return { flag: true, ms: 'อัปเดตรายการสำเร็จ' };
  }

  async removePlanItem(ppiId: number, upBy: number, user: JwtUser) {
    const item = await this.itemRepo.findOne({ where: { ppiId, del: 0 } });
    if (!item) throw new NotFoundException('ไม่พบรายการ');
    const plan = await this.planRepo.findOne({
      where: { ppId: item.ppId, del: 0 },
    });
    if (!plan) throw new NotFoundException('ไม่พบแผน');
    if (user.type !== 1 && plan.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถลบข้อมูลของโรงเรียนอื่นได้');
    }
    if (plan.ppStatus === 1)
      throw new BadRequestException('แผนประกาศแล้ว ลบรายการไม่ได้');
    item.del = 1;
    item.upBy = upBy || item.upBy;
    await this.itemRepo.save(item);
    return { flag: true, ms: 'ลบรายการสำเร็จ' };
  }

  async progressReport(scId: number, acadYear: number) {
    const plans = await this.planRepo.find({
      where: { scId, acadYear, del: 0 },
      order: { ppId: 'ASC' },
    });

    const result: any[] = [];
    let grandPlan = 0;
    let grandActual = 0;

    for (const plan of plans) {
      const items = await this.itemRepo.find({
        where: { ppId: plan.ppId, del: 0 },
        order: { ppiId: 'ASC' },
      });

      const itemRows: any[] = [];
      let planSubtotal = 0;
      let actualSubtotal = 0;

      for (const item of items) {
        const orders = await this.orderRepo
          .createQueryBuilder('o')
          .where('o.ppi_id = :ppiId', { ppiId: item.ppiId })
          .andWhere('o.del = 0')
          .andWhere('o.sc_id = :scId', { scId })
          .getMany();

        const latestOrder =
          orders.find((o) => o.orderStatus !== 9) ?? orders[0] ?? null;
        const actualBudget = latestOrder ? Number(latestOrder.budgets) || 0 : 0;
        planSubtotal += Number(item.itemBudget || 0);
        actualSubtotal += actualBudget;

        itemRows.push({
          ppi_id: item.ppiId,
          item_title: item.itemTitle,
          item_budget: Number(item.itemBudget || 0),
          buy_month: item.buyMonth,
          method_type: item.methodType,
          method_type_name: METHOD_TYPE[item.methodType] ?? '',
          orders: orders.map((o) => ({
            order_id: o.orderId,
            order_status: o.orderStatus,
            order_status_name: ORDER_STATUS[o.orderStatus] ?? '',
            budgets: Number(o.budgets || 0),
            is_urgent: o.isUrgent,
          })),
          order_count: orders.length,
          order_status: latestOrder?.orderStatus ?? null,
          order_status_name: latestOrder
            ? (ORDER_STATUS[latestOrder.orderStatus] ?? '')
            : 'ยังไม่ดำเนินการ',
          actual_budget: actualBudget,
          variance: Number(item.itemBudget || 0) - actualBudget,
          completed: latestOrder?.orderStatus === 8,
          cancelled: latestOrder?.orderStatus === 9,
        });
      }

      grandPlan += planSubtotal;
      grandActual += actualSubtotal;

      result.push({
        pp_id: plan.ppId,
        pp_no: plan.ppNo,
        pp_title: plan.ppTitle,
        pp_total_budget: Number(plan.ppTotalBudget || 0),
        pp_status: plan.ppStatus,
        items: itemRows,
        plan_subtotal: planSubtotal,
        actual_subtotal: actualSubtotal,
        variance: planSubtotal - actualSubtotal,
        completion_rate:
          items.length > 0
            ? Math.round(
                (itemRows.filter((r) => r.completed).length / items.length) *
                  100,
              )
            : 0,
      });
    }

    return {
      data: result,
      summary: {
        grand_plan: grandPlan,
        grand_actual: grandActual,
        grand_variance: grandPlan - grandActual,
        total_items: result.reduce((s, p) => s + p.items.length, 0),
        completed_items: result.reduce(
          (s, p) => s + p.items.filter((i) => i.completed).length,
          0,
        ),
      },
    };
  }
}
