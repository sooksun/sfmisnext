import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { ParcelOrder } from './entities/parcel-order.entity';
import { ParcelDetail } from './entities/parcel-detail.entity';
import { PlnProjApprove } from './entities/pln-proj-approve.entity';
import { ApproveParcelByPlanDto } from './dto/approve-parcel-by-plan.dto';
import { ApproveParcelByBusinessDto } from './dto/approve-parcel-by-business.dto';
import { ApproveParcelByCeoDto } from './dto/approve-parcel-by-ceo.dto';
import { LoadParcelDetailDto } from './dto/load-parcel-detail.dto';
import { AddProjectApproveDto } from './dto/add-project-approve.dto';
import { UpdateProjectApproveDto } from './dto/update-project-approve.dto';
import { RemoveParcelOrderDto } from './dto/remove-parcel-order.dto';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';

// สถานะที่ถือว่า "ยกเลิก/ไม่อนุมัติ" — ไม่นับในยอดที่ใช้ไป
const CANCELLED_STATUSES = [101, 201] as const;

@Injectable()
export class ProjectApproveService {
  constructor(
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepository: Repository<ParcelOrder>,
    @InjectRepository(ParcelDetail)
    private readonly parcelDetailRepository: Repository<ParcelDetail>,
    @InjectRepository(PlnProjApprove)
    private readonly plnProjApproveRepository: Repository<PlnProjApprove>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
  ) {}

  async loadProjectApprove(
    scId: number,
    syId: number,
    page?: number,
    pageSize?: number,
  ) {
    // โหลดจาก ParcelOrder (parcel_order) ซึ่งเป็นตารางที่ Angular ใช้ใน proj-approve
    // status: 0=ทบทวน, 1=ขอ, 2=แผน, 3=การเงิน, 4=พัสดุ, 5=ผอ., 6=ตั้งกรรมการ, 7=จัดซื้อ, 8=สำเร็จ
    const queryBuilder = this.parcelOrderRepository
      .createQueryBuilder('po')
      .where('po.sc_id = :scId', { scId })
      .andWhere('po.acad_year = :syId', { syId })
      .andWhere('po.del = 0')
      .orderBy('po.order_id', 'DESC');

    if (page !== undefined && pageSize !== undefined) {
      queryBuilder.skip(page * pageSize).take(pageSize);
    }

    const [data, count] = await queryBuilder.getManyAndCount();

    const formattedData = data.map((item) => ({
      order_id: item.orderId,
      order_status: item.orderStatus,
      details: item.details ?? '',
      budgets: item.budgets ?? 0,
      remark: item.remark ?? '',
      remark_cf_plan: item.remarkCfPlan ?? '',
      remark_cf_business: item.remarkCfBusiness ?? '',
      remark_cf_suppile: item.remarkCfSuppile ?? '',
      remark_cf_ceo: item.remarkCfCeo ?? '',
      cancel_reason: item.cancelReason ?? '',
      cancel_by: item.cancelBy ?? null,
      cancel_date: item.cancelDate,
      is_urgent: item.isUrgent ?? 0,
      urgent_clause: item.urgentClause ?? '',
      urgent_reason: item.urgentReason ?? '',
      sc_id: item.scId,
      acad_year: item.acadYear,
      del: item.del,
      create_date: item.createDate,
      update_date: item.updateDate,
    }));

    if (page !== undefined && pageSize !== undefined) {
      return { data: formattedData, count };
    }

    return formattedData;
  }

  async loadParcelOrder(scId: number, _ppaId: number) {
    // Load parcel order by ppa_id (project approve id)
    // This might need to join with pln_proj_approve
    const parcelOrder = await this.parcelOrderRepository.findOne({
      where: {
        scId,
        del: 0,
      },
    });

    return parcelOrder;
  }

  async loadParcelDetail(dto: LoadParcelDetailDto) {
    const details = await this.parcelDetailRepository.find({
      where: {
        orderId: dto.order_id,
        del: 0,
      },
    });

    return details.map((detail) => ({
      pc_id: detail.pcId,
      order_id: detail.orderId,
      supp_id: detail.suppId,
      pc_total: detail.pcTotal,
      del: detail.del,
      create_date: detail.createDate,
      update_date: detail.updateDate,
    }));
  }

  async loadSuppilesByOrderID(orderId: number, scId: number) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId, scId, del: 0 },
    });
    if (!order) return [];

    const details = await this.parcelDetailRepository.find({
      where: {
        orderId,
        del: 0,
      },
    });

    return details.map((detail) => ({
      pc_id: detail.pcId,
      order_id: detail.orderId,
      supp_id: detail.suppId,
      pc_total: detail.pcTotal,
      count: detail.pcTotal, // For compatibility
      del: detail.del,
      create_date: detail.createDate,
      update_date: detail.updateDate,
    }));
  }

  async loadBudgetBalance(
    orderId: number,
    projectId: number,
    scId: number,
    _year: number,
  ) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId, projectId, scId, del: 0 },
    });

    if (!order) return 0;

    const allocatedBudget = order.budgets ?? 0;

    // รวมยอดที่ขอเบิกไปแล้วในคำสั่งซื้อนี้
    // ไม่นับสถานะ: 101=หัวหน้าไม่อนุมัติ, 201=ยกเลิกเช็ค
    const result = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .select('SUM(rw.amount)', 'totalWithdrawn')
      .where('rw.order_id = :orderId', { orderId })
      .andWhere('rw.del = 0')
      .andWhere('rw.status NOT IN (:...cancelled)', {
        cancelled: CANCELLED_STATUSES,
      })
      .getRawOne<{ totalWithdrawn: string }>();

    const totalWithdrawn = Number(result?.totalWithdrawn ?? 0);
    const remaining =
      Math.round((allocatedBudget - totalWithdrawn) * 100) / 100;

    return {
      allocated: allocatedBudget,
      withdrawn: Math.round(totalWithdrawn * 100) / 100,
      remaining,
    };
  }

  // Status flow: 0=ทบทวน, 1=ขอ, 2=แผน, 3=การเงิน, 4=พัสดุ, 5=ผอ., 6=กรรมการ, 7=จัดซื้อ, 8=สำเร็จ, 9=ยกเลิก
  private assertValidTransition(
    current: number,
    target: number,
    allowedFrom: number,
    stepName: string,
  ) {
    // ยืดหยุ่นสำหรับ reject (target=0): อนุญาตจาก step ปัจจุบันเท่านั้น
    if (target === 0) {
      if (current !== allowedFrom) {
        throw new BadRequestException(
          `ไม่สามารถปฏิเสธได้: สถานะปัจจุบัน (${current}) ไม่ใช่ขั้นตอน ${stepName}`,
        );
      }
      return;
    }
    // approve: สถานะปัจจุบันต้องเป็น allowedFrom
    if (current !== allowedFrom) {
      throw new BadRequestException(
        `ไม่สามารถดำเนินการได้: ต้องอยู่ที่สถานะ ${allowedFrom} ก่อน (ปัจจุบัน: ${current})`,
      );
    }
  }

  async approveParcelByPlan(dto: ApproveParcelByPlanDto, scId: number) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    // H3: State Machine — ต้องอยู่ที่สถานะ 1 (ขอ) ก่อน
    this.assertValidTransition(order.orderStatus, dto.order_status, 1, 'แผน');

    if (dto.remark) order.remarkCfPlan = dto.remark;
    if (dto.order_status === 0) {
      // M6: เก็บ remark เดิมไว้; เพิ่ม remark_cf เป็น prefix แทนการทับ
      order.remark = dto.remark_cf
        ? `[ปฏิเสธ] ${dto.remark_cf}`
        : order.remark;
    }
    order.orderStatus = dto.order_status;

    await this.parcelOrderRepository.save(order);
    return { flag: true };
  }

  async approveParcelByBusiness(dto: ApproveParcelByBusinessDto, scId: number) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    // H3: State Machine — ต้องอยู่ที่สถานะ 2 (แผน) ก่อน
    this.assertValidTransition(order.orderStatus, dto.order_status, 2, 'การเงิน');

    if (dto.remark) order.remarkCfBusiness = dto.remark;
    if (dto.order_status === 0) {
      order.remark = dto.remark_cf
        ? `[ปฏิเสธ] ${dto.remark_cf}`
        : order.remark;
    }
    order.orderStatus = dto.order_status;

    await this.parcelOrderRepository.save(order);
    return { flag: true };
  }

  async approveParcelBySupplie(
    dto: {
      order_id: number;
      order_status: number;
      remark?: string;
      remark_cf?: string;
    },
    scId: number,
  ) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    // H3: State Machine — ต้องอยู่ที่สถานะ 3 (การเงิน) ก่อน
    this.assertValidTransition(order.orderStatus, dto.order_status, 3, 'พัสดุ');

    if (dto.remark) order.remarkCfSuppile = dto.remark;
    if (dto.order_status === 0) {
      order.remark = dto.remark_cf
        ? `[ปฏิเสธ] ${dto.remark_cf}`
        : order.remark;
    }
    order.orderStatus = dto.order_status;

    await this.parcelOrderRepository.save(order);
    return { flag: true };
  }

  async approveParcelByCeo(dto: ApproveParcelByCeoDto, scId: number) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    // H3: State Machine — ต้องอยู่ที่สถานะ 4 (พัสดุ) ก่อน
    this.assertValidTransition(order.orderStatus, dto.order_status, 4, 'ผอ.');

    if (dto.remark) order.remarkCfCeo = dto.remark;
    if (dto.order_status === 0) {
      order.remark = dto.remark_cf
        ? `[ปฏิเสธ] ${dto.remark_cf}`
        : order.remark;
    }
    order.orderStatus = dto.order_status;

    await this.parcelOrderRepository.save(order);
    return { flag: true };
  }

  async addProjectApprove(dto: AddProjectApproveDto) {
    const safeDate = (val: string | undefined): Date =>
      val ? new Date(val) : new Date('2000-01-01');

    const projectApprove = this.plnProjApproveRepository.create({
      scId: dto.sc_id,
      acadYear: dto.acad_year ?? (dto as any).sy_id ?? 0,
      projId: dto.proj_id ?? 0,
      numbers: dto.numbers ?? 0,
      details: (dto as any).project_name ?? dto.details ?? '',
      resources: (dto as any).project_code ?? dto.resources ?? '',
      totalBudgets: (dto as any).budget_amount ?? dto.total_budgets ?? 0,
      budgets: (dto as any).budget_amount ?? dto.budgets ?? 0,
      remaindBudgets: dto.remaind_budgets ?? 0,
      operateDate: safeDate(dto.operate_date),
      jobType: dto.job_type ?? 0,
      noteNumber: dto.note_number ?? 0,
      buyDate: safeDate(dto.buy_date),
      buyReason: dto.buy_reason ?? '',
      departments: dto.departments ?? 0,
      dueDate: dto.due_date ?? 0,
      committee1: dto.committee1 ?? '',
      committee2: dto.committee2 ?? '',
      committee3: dto.committee3 ?? '',
      bookOrderCommittee: dto.book_order_committee ?? '',
      dateOrderCommittee: safeDate(dto.date_order_committee),
      bookReportNumber: dto.book_report_number ?? '',
      dateBookReport: dto.date_book_report ?? '',
      suppliers: dto.suppliers ?? 0,
      presentCost: dto.present_cost ?? 0,
      dateWin: safeDate(dto.date_win),
      numberOrders: dto.number_orders ?? '',
      ordersDate: safeDate(dto.orders_date),
      dueOrdersDate: dto.due_orders_date ?? 0,
      overDueDate: safeDate(dto.over_due_date),
      proveDate: safeDate(dto.prove_date),
      numberReportWiddraw: dto.number_report_widdraw ?? '',
      dateReportWiddraw: safeDate(dto.date_report_widdraw),
      upBy: dto.up_by || 0,
    });

    await this.plnProjApproveRepository.save(projectApprove);

    return { flag: true };
  }

  async updateProjectApprove(dto: UpdateProjectApproveDto, scId: number) {
    const projectApprove = await this.plnProjApproveRepository.findOne({
      where: { ppaId: dto.ppa_id, scId, del: 0 },
    });

    if (!projectApprove) {
      return { flag: false, ms: 'ไม่พบข้อมูลการอนุมัติโครงการ' };
    }

    if (dto.sc_id !== undefined) projectApprove.scId = dto.sc_id;
    if (dto.acad_year !== undefined) projectApprove.acadYear = dto.acad_year;
    if (dto.proj_id !== undefined) projectApprove.projId = dto.proj_id;
    if (dto.numbers !== undefined) projectApprove.numbers = dto.numbers;
    if (dto.details !== undefined) projectApprove.details = dto.details;
    if (dto.resources !== undefined) projectApprove.resources = dto.resources;
    if (dto.total_budgets !== undefined)
      projectApprove.totalBudgets = dto.total_budgets;
    if (dto.budgets !== undefined) projectApprove.budgets = dto.budgets;
    if (dto.remaind_budgets !== undefined)
      projectApprove.remaindBudgets = dto.remaind_budgets;
    const safeDate = (val: string | undefined, fallback: Date): Date =>
      val ? new Date(val) : fallback;

    if (dto.operate_date !== undefined)
      projectApprove.operateDate = safeDate(
        dto.operate_date,
        projectApprove.operateDate,
      );
    if (dto.job_type !== undefined) projectApprove.jobType = dto.job_type;
    if (dto.note_number !== undefined)
      projectApprove.noteNumber = dto.note_number;
    if (dto.buy_date !== undefined)
      projectApprove.buyDate = safeDate(dto.buy_date, projectApprove.buyDate);
    if (dto.buy_reason !== undefined) projectApprove.buyReason = dto.buy_reason;
    if (dto.departments !== undefined)
      projectApprove.departments = dto.departments;
    if (dto.due_date !== undefined) projectApprove.dueDate = dto.due_date;
    if (dto.committee1 !== undefined)
      projectApprove.committee1 = dto.committee1;
    if (dto.committee2 !== undefined)
      projectApprove.committee2 = dto.committee2;
    if (dto.committee3 !== undefined)
      projectApprove.committee3 = dto.committee3;
    if (dto.book_order_committee !== undefined)
      projectApprove.bookOrderCommittee = dto.book_order_committee;
    if (dto.date_order_committee !== undefined)
      projectApprove.dateOrderCommittee = safeDate(
        dto.date_order_committee,
        projectApprove.dateOrderCommittee,
      );
    if (dto.book_report_number !== undefined)
      projectApprove.bookReportNumber = dto.book_report_number;
    if (dto.date_book_report !== undefined)
      projectApprove.dateBookReport = dto.date_book_report;
    if (dto.suppliers !== undefined) projectApprove.suppliers = dto.suppliers;
    if (dto.present_cost !== undefined)
      projectApprove.presentCost = dto.present_cost;
    if (dto.date_win !== undefined)
      projectApprove.dateWin = safeDate(dto.date_win, projectApprove.dateWin);
    if (dto.number_orders !== undefined)
      projectApprove.numberOrders = dto.number_orders;
    if (dto.orders_date !== undefined)
      projectApprove.ordersDate = safeDate(
        dto.orders_date,
        projectApprove.ordersDate,
      );
    if (dto.due_orders_date !== undefined)
      projectApprove.dueOrdersDate = dto.due_orders_date;
    if (dto.over_due_date !== undefined)
      projectApprove.overDueDate = safeDate(
        dto.over_due_date,
        projectApprove.overDueDate,
      );
    if (dto.prove_date !== undefined)
      projectApprove.proveDate = safeDate(
        dto.prove_date,
        projectApprove.proveDate,
      );
    if (dto.number_report_widdraw !== undefined)
      projectApprove.numberReportWiddraw = dto.number_report_widdraw;
    if (dto.date_report_widdraw !== undefined)
      projectApprove.dateReportWiddraw = safeDate(
        dto.date_report_widdraw,
        projectApprove.dateReportWiddraw,
      );
    if (dto.up_by !== undefined) projectApprove.upBy = dto.up_by;

    await this.plnProjApproveRepository.save(projectApprove);

    return { flag: true };
  }

  async cancelParcelOrder(
    dto: { order_id: number; cancel_reason: string; up_by?: number },
    scId: number,
  ) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };
    if (order.orderStatus === 9) {
      return { flag: false, ms: 'คำสั่งซื้อนี้ถูกยกเลิกไปแล้ว' };
    }
    if (order.orderStatus === 8) {
      return {
        flag: false,
        ms: 'คำสั่งซื้อเสร็จสมบูรณ์แล้ว ไม่สามารถยกเลิกได้',
      };
    }
    if (!dto.cancel_reason?.trim()) {
      return { flag: false, ms: 'กรุณาระบุเหตุผลการยกเลิก' };
    }

    order.orderStatus = 9;
    order.cancelReason = dto.cancel_reason.trim();
    order.cancelBy = dto.up_by ?? null;
    order.cancelDate = new Date();
    if (dto.up_by !== undefined) order.upBy = dto.up_by;

    await this.parcelOrderRepository.save(order);
    return { flag: true, ms: 'ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว' };
  }

  async setParcelOrderUrgent(
    dto: {
      order_id: number;
      is_urgent: number;
      urgent_clause?: string;
      urgent_reason?: string;
      up_by?: number;
    },
    scId: number,
  ) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    const urgent = dto.is_urgent ? 1 : 0;
    if (urgent && !dto.urgent_reason?.trim()) {
      return { flag: false, ms: 'กรุณาระบุเหตุผลเร่งด่วน' };
    }

    order.isUrgent = urgent;
    order.urgentClause = urgent
      ? dto.urgent_clause?.trim() || '56(2)(ง)'
      : null;
    order.urgentReason = urgent ? (dto.urgent_reason?.trim() ?? null) : null;
    if (dto.up_by !== undefined) order.upBy = dto.up_by;

    await this.parcelOrderRepository.save(order);
    return {
      flag: true,
      ms: urgent ? 'บันทึกรายการเร่งด่วนแล้ว' : 'ยกเลิกสถานะเร่งด่วนแล้ว',
    };
  }

  async removeParcelOrder(dto: RemoveParcelOrderDto, scId: number) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, scId, del: 0 },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };
    }

    order.del = dto.del;
    await this.parcelOrderRepository.save(order);

    return { flag: true };
  }

  async loadPartner(scId: number) {
    const partners = await this.partnerRepository.find({
      where: {
        scId,
        del: 0,
      },
      order: { pId: 'ASC' },
    });

    return partners.map((partner) => ({
      p_id: partner.pId,
      p_name: partner.pName,
      pay_type: partner.payType,
      cal_vat: partner.calVat,
      del: partner.del,
    }));
  }

  async loadProject(scId: number) {
    // Load all parcel orders (projects) for the school
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        del: 0,
      },
      order: { orderId: 'DESC' },
    });

    return orders.map((order) => ({
      order_id: order.orderId,
      project_id: order.projectId,
      project_type: order.projectType,
      sc_id: order.scId,
      bg_type_id: order.bgTypeId,
      admin_id: order.adminId,
      order_date: order.orderDate,
      order_status: order.orderStatus,
      remark_cf_plan: order.remarkCfPlan,
      remark_cf_business: order.remarkCfBusiness,
      remark_cf_ceo: order.remarkCfCeo,
    }));
  }

  async loadDirector(scId: number) {
    // Load admin users with type = 8 (หัวหน้าการเงิน) or type = 2 (ผู้อำนวยการ)
    const directors = await this.adminRepository
      .createQueryBuilder('admin')
      .where('admin.scId = :scId', { scId })
      .andWhere('admin.del = :del', { del: 0 })
      .andWhere('(admin.type = :type1 OR admin.type = :type2)', {
        type1: 8,
        type2: 2,
      })
      .orderBy('admin.adminId', 'ASC')
      .getMany();

    return directors.map((admin) => ({
      admin_id: admin.adminId,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      type: admin.type,
      sc_id: admin.scId,
    }));
  }
}
