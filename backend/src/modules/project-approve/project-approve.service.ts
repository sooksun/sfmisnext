import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async loadSuppilesByOrderID(orderId: number) {
    // Load supplies by order_id from parcel_detail
    // This might need to join with supplies table
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
    // Calculate budget balance
    // This is a simplified version - might need to join with budget tables
    const order = await this.parcelOrderRepository.findOne({
      where: {
        orderId,
        projectId,
        scId,
        del: 0,
      },
    });

    if (!order) {
      return 0;
    }

    // TODO: Calculate actual budget balance from project budget and expenses
    return order.budgets || 0;
  }

  async approveParcelByPlan(dto: ApproveParcelByPlanDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: {
        orderId: dto.order_id,
        del: 0,
      },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };
    }

    order.orderStatus = dto.order_status;
    if (dto.remark) {
      order.remarkCfPlan = dto.remark;
    }
    if (dto.order_status === 0) {
      // Rejected
      order.remark = dto.remark_cf || '';
    }

    await this.parcelOrderRepository.save(order);

    return { flag: true };
  }

  async approveParcelByBusiness(dto: ApproveParcelByBusinessDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: {
        orderId: dto.order_id,
        del: 0,
      },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };
    }

    order.orderStatus = dto.order_status;
    if (dto.remark) {
      order.remarkCfBusiness = dto.remark;
    }
    if (dto.order_status === 0) {
      // Rejected
      order.remark = dto.remark_cf || '';
    }

    await this.parcelOrderRepository.save(order);

    return { flag: true };
  }

  async approveParcelBySupplie(dto: { order_id: number; order_status: number; remark?: string; remark_cf?: string }) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, del: 0 },
    });
    if (!order) return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };

    order.orderStatus = dto.order_status; // 4 = อนุมัติ, 0 = ทบทวน
    if (dto.remark) order.remarkCfSuppile = dto.remark;
    if (dto.order_status === 0) order.remark = dto.remark_cf || '';

    await this.parcelOrderRepository.save(order);
    return { flag: true };
  }

  async approveParcelByCeo(dto: ApproveParcelByCeoDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: {
        orderId: dto.order_id,
        del: 0,
      },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบคำสั่งซื้อ' };
    }

    order.orderStatus = dto.order_status;
    if (dto.remark) {
      order.remarkCfCeo = dto.remark;
    }
    if (dto.order_status === 0) {
      // Rejected
      order.remark = dto.remark_cf || '';
    }

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

  async updateProjectApprove(dto: UpdateProjectApproveDto) {
    const projectApprove = await this.plnProjApproveRepository.findOne({
      where: {
        ppaId: dto.ppa_id,
        del: 0,
      },
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

  async removeParcelOrder(dto: RemoveParcelOrderDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: {
        orderId: dto.order_id,
        del: 0,
      },
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
