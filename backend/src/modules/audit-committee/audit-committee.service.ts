import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { UpdateSetCommitteeDto } from './dto/update-set-committee.dto';

@Injectable()
export class AuditCommitteeService {
  constructor(
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepository: Repository<ParcelOrder>,
  ) {}

  async loadAuditCommitteeStatus(scId: number, _yearId: number) {
    // Load parcel orders that need committee setup (order_status = 6 or related)
    // Also include orders that might have been set but need review
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        del: 0,
        // Filter by year if needed - might need to join with school_year or project
        // For now, load all orders that are in committee setup stage
      },
      order: { orderId: 'DESC' },
    });

    // Filter by year if yearId is provided
    // This might need to join with project or school_year table
    // For now, return all orders
    const formattedData = orders.map((order) => ({
      order_id: order.orderId,
      project_id: order.projectId,
      project_type: order.projectType,
      sc_id: order.scId,
      bg_type_id: order.bgTypeId,
      admin_id: order.adminId,
      order_date: order.orderDate,
      order_status: order.orderStatus,
      remark: order.remark,
      remark_cf_plan: order.remarkCfPlan,
      remark_cf_business: order.remarkCfBusiness,
      remark_cf_suppile: order.remarkCfSuppile,
      remark_cf_ceo: order.remarkCfCeo,
      operate_date: order.operateDate,
      acad_year: order.acadYear,
      numbers: order.numbers,
      details: order.details,
      p_id: order.pId,
      resources: order.resources,
      budgets: order.budgets,
      job_type: order.jobType,
      note_number: order.noteNumber,
      buy_date: order.buyDate,
      buy_reason: order.buyReason,
      departments: order.departments,
      due_date: order.dueDate,
      committee1: order.committee1,
      committee2: order.committee2,
      committee3: order.committee3,
      date_deadline: order.dateDeadline,
      day_deadline: order.dayDeadline,
      book_order_committee: order.bookOrderCommittee,
      date_order_committee: order.dateOrderCommittee,
      book_report_number: order.bookReportNumber,
      date_book_report: order.dateBookReport,
      suppliers: order.suppliers,
      present_cost: order.presentCost,
      date_win: order.dateWin,
      number_orders: order.numberOrders,
      orders_date: order.ordersDate,
      due_orders_date: order.dueOrdersDate,
      over_due_date: order.overDueDate,
      prove_date: order.proveDate,
      number_report_widdraw: order.numberReportWiddraw,
      date_report_widdraw: order.dateReportWiddraw,
      up_by: order.upBy,
    }));

    return {
      data: formattedData,
      count: formattedData.length,
    };
  }

  async updateSetCommittee(dto: UpdateSetCommitteeDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, del: 0 },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    // Update committee information - ensure numbers
    order.committee1 =
      typeof dto.committee1 === 'string'
        ? parseInt(dto.committee1) || 0
        : dto.committee1 || 0;
    order.committee2 =
      typeof dto.committee2 === 'string'
        ? parseInt(dto.committee2) || 0
        : dto.committee2 || 0;
    order.committee3 =
      typeof dto.committee3 === 'string'
        ? parseInt(dto.committee3) || 0
        : dto.committee3 || 0;
    order.orderStatus =
      typeof dto.order_status === 'string'
        ? parseInt(dto.order_status)
        : dto.order_status;
    order.pId =
      typeof dto.p_id === 'string' ? parseInt(dto.p_id) || 0 : dto.p_id || 0;
    order.dayDeadline =
      typeof dto.day_deadline === 'string'
        ? parseInt(dto.day_deadline) || 1
        : dto.day_deadline || 1;

    // Parse date_deadline string to Date
    if (dto.date_deadline) {
      try {
        order.dateDeadline = new Date(dto.date_deadline);
        // Also set due_date from date_deadline
        order.dueDate = new Date(dto.date_deadline);
      } catch (error) {
        console.error('Error parsing date_deadline:', error);
      }
    }

    if (dto.remark !== undefined) {
      order.remark = dto.remark;
    }

    order.updateDate = new Date();

    try {
      await this.parcelOrderRepository.save(order);
      console.log('Committee saved successfully:', {
        order_id: order.orderId,
        committee1: order.committee1,
        committee2: order.committee2,
        committee3: order.committee3,
        p_id: order.pId,
        order_status: order.orderStatus,
      });
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Error saving committee:', error);
      return {
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error as Error).message,
      };
    }
  }
}
