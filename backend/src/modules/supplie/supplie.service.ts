import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { Supplies } from './entities/supplies.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SupInspection } from './entities/sup-inspection.entity';
import { EditReceiveParcelDto } from './dto/edit-receive-parcel.dto';
import { UpdateSupplieOrderDto } from './dto/update-supplie-order.dto';
import { ConfirmWithdrawParcelDto } from './dto/confirm-withdraw-parcel.dto';
import { LoadStockSupplieDto } from './dto/load-stock-supplie.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class SupplieService {
  constructor(
    @InjectRepository(ReceiveParcelOrder)
    private readonly receiveParcelOrderRepository: Repository<ReceiveParcelOrder>,
    @InjectRepository(ReceiveParcelDetail)
    private readonly receiveParcelDetailRepository: Repository<ReceiveParcelDetail>,
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepository: Repository<ParcelOrder>,
    @InjectRepository(ParcelDetail)
    private readonly parcelDetailRepository: Repository<ParcelDetail>,
    @InjectRepository(Supplies)
    private readonly suppliesRepository: Repository<Supplies>,
    @InjectRepository(TransactionSupplies)
    private readonly transactionSuppliesRepository: Repository<TransactionSupplies>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(SupInspection)
    private readonly supInspectionRepository: Repository<SupInspection>,
    private readonly dataSource: DataSource,
  ) {}

  async loadReceive(scId: number, syId: number) {
    const receives = await this.receiveParcelOrderRepository.find({
      where: {
        scId,
        syYear: syId,
        del: 0,
      },
      order: { receiveId: 'DESC' },
    });

    // Batch-load (กัน N+1): ข้อมูลตรวจรับ (ตาม order_id) + จำนวนรายการที่รับ (ตาม receive_id)
    const orderIds = receives.map((r) => r.orderId).filter((id) => id > 0);
    const receiveIds = receives.map((r) => r.receiveId);

    const inspections =
      orderIds.length > 0
        ? await this.supInspectionRepository.find({
            where: { orderId: In(orderIds), del: 0 },
          })
        : [];
    // เก็บ inspection ล่าสุดต่อ 1 order (find เรียงตาม insp_id เริ่มต้น — ใช้ตัว id มากสุด)
    const inspByOrder = new Map<number, SupInspection>();
    for (const insp of inspections) {
      if (insp.orderId == null) continue;
      const cur = inspByOrder.get(insp.orderId);
      if (!cur || insp.inspId > cur.inspId) inspByOrder.set(insp.orderId, insp);
    }

    const details =
      receiveIds.length > 0
        ? await this.receiveParcelDetailRepository.find({
            where: { receiveId: In(receiveIds), del: 0 },
          })
        : [];
    const itemCountByReceive = new Map<number, number>();
    for (const d of details) {
      if (d.receiveId == null) continue;
      itemCountByReceive.set(
        d.receiveId,
        (itemCountByReceive.get(d.receiveId) ?? 0) + 1,
      );
    }

    return receives.map((receive) => {
      const insp = inspByOrder.get(receive.orderId);
      return {
        receive_id: receive.receiveId,
        admin_id: receive.adminId,
        agent_admin_id: receive.agentAdminId,
        user_pacel_id: receive.userPacelId,
        sc_id: receive.scId,
        order_id: receive.orderId,
        sy_year: receive.syYear,
        title: receive.title,
        project_name: receive.title,
        del: receive.del,
        receive_date: receive.receiveDate,
        receive_status: receive.receiveStatus,
        total_items: itemCountByReceive.get(receive.receiveId) ?? 0,
        // ── ข้อมูลตรวจรับ (เอกสาร พ.ร.บ. ม.100-104) ที่ผูกกับคำสั่งซื้อนี้ ──
        insp_id: insp?.inspId ?? null,
        insp_result: insp?.inspResult ?? null,
        stock_posted: insp?.stockPosted ?? 0,
        report_no: insp?.reportNo ?? null,
        create_date: receive.createDate,
        update_date: receive.updateDate,
        add: false,
      };
    });
  }

  async loadSubProject(scId: number, yearId: number) {
    // Load parcel orders that are approved (status >= 7)
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        acadYear: yearId,
        del: 0,
        orderStatus: 7, // จัดซื้อ
      },
      order: { orderId: 'DESC' },
    });

    // Batch-load all details in 1 query then group by orderId (ป้องกัน N+1)
    const orderIds = orders.map((o) => o.orderId);
    const allDetails =
      orderIds.length > 0
        ? await this.parcelDetailRepository.find({
            where: { orderId: In(orderIds), del: 0 },
          })
        : [];
    const detailsByOrderId = new Map<number, typeof allDetails>();
    for (const d of allDetails) {
      if (d.orderId === null) continue;
      const list = detailsByOrderId.get(d.orderId) ?? [];
      list.push(d);
      detailsByOrderId.set(d.orderId, list);
    }

    const result = orders.map((order) => {
      const details = detailsByOrderId.get(order.orderId) ?? [];
      return {
        order_id: order.orderId,
        project_id: order.projectId,
        details: order.details,
        resources: order.resources || 0,
        budgets: order.budgets,
        data_detail: details.map((detail) => ({
          supp_id: detail.suppId,
          pc_total: detail.pcTotal,
        })),
      };
    });

    // Calculate balance from transactions
    const balance = await this.calculateBalance(scId);

    return {
      parcel_order: result,
      balance,
    };
  }

  async loadGetUserTeacher(scId: number) {
    const users = await this.adminRepository.find({
      where: {
        scId,
        del: 0,
      },
      order: { adminId: 'ASC' },
    });

    return users.map((user) => ({
      admin_id: user.adminId,
      name: user.name,
      username: user.username,
      email: user.email,
      type: user.type,
      sc_id: user.scId,
    }));
  }

  async loadParcelDetail(orderId: number, user?: JwtUser) {
    // Multi-tenant guard: คำสั่งซื้อต้องเป็นของโรงเรียนผู้ใช้
    if (user) {
      const order = await this.parcelOrderRepository.findOne({
        where: { orderId, del: 0 },
      });
      if (order && order.scId != null) assertSameSchool(user, order.scId);
    }
    const details = await this.parcelDetailRepository.find({
      where: {
        orderId,
        del: 0,
      },
    });

    // ชื่อวัสดุ (ให้หน้า "บันทึกรับพัสดุ" แสดงรายการที่อ่านออก ไม่ใช่แค่ supp_id)
    const suppIds = details
      .map((d) => d.suppId)
      .filter((id): id is number => !!id);
    const supplies =
      suppIds.length > 0
        ? await this.suppliesRepository.find({
            where: { suppId: In(suppIds), del: 0 },
          })
        : [];
    const nameBySuppId = new Map<number, string>();
    for (const s of supplies) nameBySuppId.set(s.suppId, s.suppName);

    return details.map((detail) => ({
      pc_id: detail.pcId,
      order_id: detail.orderId,
      supp_id: detail.suppId,
      sp_name: detail.suppId ? (nameBySuppId.get(detail.suppId) ?? '') : '',
      pc_total: detail.pcTotal,
      del: detail.del,
      create_date: detail.createDate,
      update_date: detail.updateDate,
    }));
  }

  async loadParcelDetailWithdraw(
    orderId: number,
    receiveId: number,
    scId: number,
  ) {
    const parcelDetails = await this.parcelDetailRepository.find({
      where: {
        orderId,
        del: 0,
      },
    });

    const receiveDetails = await this.receiveParcelDetailRepository.find({
      where: {
        receiveId,
        del: 0,
      },
    });

    // ชื่อวัสดุ (ให้ dialog ตรวจรับแสดงรายการที่อ่านออก ไม่ใช่แค่ supp_id)
    const suppIds = parcelDetails
      .map((pd) => pd.suppId)
      .filter((id): id is number => !!id);
    const supplies =
      suppIds.length > 0
        ? await this.suppliesRepository.find({
            where: { suppId: In(suppIds), del: 0 },
          })
        : [];
    const nameBySuppId = new Map<number, string>();
    for (const s of supplies) nameBySuppId.set(s.suppId, s.suppName);

    // Calculate balance for each supply
    const balance = await this.calculateBalance(scId);

    return {
      parcel_detail: parcelDetails.map((pd) => {
        const rp = receiveDetails.find((rd) => rd.suppId === pd.suppId);
        return {
          pc_id: pd.pcId,
          order_id: pd.orderId,
          supp_id: pd.suppId,
          sp_name: pd.suppId ? (nameBySuppId.get(pd.suppId) ?? '') : '',
          pc_total: pd.pcTotal,
          rp_id: rp?.rpId || 0,
          rp_total: rp?.rpTotal || 0,
        };
      }),
      balance: balance.map((b) => ({
        supp_id: b.suppId,
        trans_balance: b.transBalance,
      })),
    };
  }

  async loadStockSupplie(dto: LoadStockSupplieDto) {
    // Get all supplies for this school
    const allSupplies = await this.suppliesRepository.find({
      where: {
        scId: dto.sc_id,
        del: 0,
      },
    });

    // Calculate balance for each supply
    const balanceMap = await this.calculateBalanceMap(dto.sc_id);

    // Get receive details if receive_id is provided
    const receiveDetailsMap = new Map<number, number>();
    if (dto.receive_id) {
      const receiveDetails = await this.receiveParcelDetailRepository.find({
        where: {
          receiveId: dto.receive_id,
          del: 0,
        },
      });
      receiveDetails.forEach((rd) => {
        receiveDetailsMap.set(rd.suppId || 0, rd.rpTotal || 0);
      });
    }

    // Build result with balance
    const result = allSupplies.map((supply) => {
      const balance = balanceMap.get(supply.suppId) || 0;
      const received = receiveDetailsMap.get(supply.suppId) || 0;
      const balanceStock = balance - received;

      return {
        supp_id: supply.suppId,
        supp_no: supply.suppNo,
        supp_name: supply.suppName,
        supp_price: supply.suppPrice,
        ts_id: supply.tsId,
        un_id: supply.unId,
        supp_detail: supply.suppDetail,
        supp_address: supply.suppAddress,
        supp_cap_max: supply.suppCapMax,
        supp_cap_min: supply.suppCapMin,
        sc_id: supply.scId,
        balance_stock: balanceStock,
        balance_project: 0, // Will be set by frontend
        receive: 0,
        rp_id: 0,
      };
    });

    return result;
  }

  async loadSupplieOrder(scId: number, yearId: number) {
    // โหลด parcel_order ที่กำลังอยู่ในกระบวนการจัดซื้อ
    // — รวมทุกสถานะที่ "เกี่ยวกับงานพัสดุ" คือ ผ่าน ผอ.แล้ว (5), ตั้งกรรมการ (6), จัดซื้อ (7)
    //   เพื่อให้ผู้ใช้เห็นรายการได้ทันทีหลังอนุมัติเสร็จ ไม่ตกหล่น
    const orders = await this.parcelOrderRepository
      .createQueryBuilder('o')
      .where('o.sc_id = :scId', { scId })
      .andWhere('o.acad_year = :yearId', { yearId })
      .andWhere('o.del = 0')
      .andWhere('o.order_status IN (:...statuses)', { statuses: [5, 6, 7] })
      .orderBy('o.order_id', 'DESC')
      .getMany();

    return orders.map((order) => ({
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
    }));
  }

  async loadGetSupplieOrder(scId: number, yearId: number) {
    // Load parcel orders that are ready for check (status = 7 = จัดซื้อ)
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        acadYear: yearId,
        del: 0,
        orderStatus: 7,
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
      remark: order.remark,
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
    }));
  }

  async loadResourcesPeople(scId: number) {
    // Load admin users (similar to loadGetUserTeacher)
    return this.loadGetUserTeacher(scId);
  }

  async editReceiveParcel(dto: EditReceiveParcelDto) {
    return this.dataSource.transaction(async (manager) => {
      // Create or update receive_parcel_order
      let receive: ReceiveParcelOrder;
      if (dto.receive_id && dto.receive_id > 0) {
        const foundReceive = await manager.findOne(ReceiveParcelOrder, {
          where: { receiveId: dto.receive_id, del: 0 },
        });
        if (!foundReceive) {
          return { flag: false, ms: 'ไม่พบข้อมูลการเบิกพัสดุ' };
        }
        receive = foundReceive;
      } else {
        receive = manager.create(ReceiveParcelOrder, {});
      }

      receive.adminId = dto.admin_id;
      receive.agentAdminId = dto.agent || 0;
      receive.scId = dto.sc_id;
      receive.orderId = dto.order_id;
      receive.syYear = dto.sy_year;
      receive.title = dto.title;
      receive.receiveDate = new Date(dto.receive_date);
      receive.receiveStatus = 1;

      await manager.save(ReceiveParcelOrder, receive);

      for (const cartItem of dto.cart ?? []) {
        let detail: ReceiveParcelDetail;
        if (cartItem.rp_id && cartItem.rp_id > 0) {
          const foundDetail = await manager.findOne(ReceiveParcelDetail, {
            where: { rpId: cartItem.rp_id, del: 0 },
          });
          if (!foundDetail) continue;
          detail = foundDetail;
        } else {
          detail = manager.create(ReceiveParcelDetail, {
            receiveId: receive.receiveId,
          });
        }
        detail.suppId = cartItem.supp_id;
        detail.rpTotal = cartItem.receive;
        await manager.save(ReceiveParcelDetail, detail);
      }

      for (const cartItem of dto.cart_receive_del ?? []) {
        if (cartItem.rp_id && cartItem.rp_id > 0) {
          const detail = await manager.findOne(ReceiveParcelDetail, {
            where: { rpId: cartItem.rp_id, del: 0 },
          });
          if (detail) {
            detail.del = 1;
            await manager.save(ReceiveParcelDetail, detail);
          }
        }
      }

      return { flag: true };
    });
  }

  async removeReceiveParcel(receiveId: number, user?: JwtUser) {
    const receive = await this.receiveParcelOrderRepository.findOne({
      where: { receiveId, del: 0 },
    });

    if (!receive) {
      return { flag: false, ms: 'ไม่พบข้อมูลการรับพัสดุ' };
    }

    // Multi-tenant guard: รายการรับพัสดุต้องเป็นของโรงเรียนผู้ใช้
    if (user && receive.scId != null) assertSameSchool(user, receive.scId);

    // M5: block ลบถ้า inspection ลงสต็อกแล้ว (stockPosted=1)
    if (receive.orderId) {
      const postedInsp = await this.supInspectionRepository.findOne({
        where: { orderId: receive.orderId, stockPosted: 1, del: 0 },
      });
      if (postedInsp) {
        return {
          flag: false,
          ms: 'ไม่สามารถลบได้: ตรวจรับและลงสต็อกแล้ว',
        };
      }
    }

    receive.del = 1;
    await this.receiveParcelOrderRepository.save(receive);
    return { flag: true };
  }

  async updateSupplieOrder(dto: UpdateSupplieOrderDto, user?: JwtUser) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, del: 0 },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบข้อมูลคำสั่งซื้อ' };
    }

    // Multi-tenant guard: คำสั่งซื้อต้องเป็นของโรงเรียนผู้ใช้
    if (user && order.scId != null) assertSameSchool(user, order.scId);

    if (dto.order_status !== undefined) order.orderStatus = dto.order_status;
    if (dto.remark !== undefined) order.remark = dto.remark;
    if (dto.due_date !== undefined) order.dueDate = new Date(dto.due_date);

    await this.parcelOrderRepository.save(order);

    return { flag: true };
  }

  // M4: "ยืนยันรับพัสดุ" = รับเข้าสต็อก (trans_in) ไม่ใช่จ่ายออก
  // ชื่อเดิม confirmWithDrawParcel แต่ semantics คือ "ยืนยันรับ" = trans_in
  async confirmReceiveParcel(dto: ConfirmWithdrawParcelDto) {
    return this.dataSource.transaction(async (manager) => {
      const receive = await manager.findOne(ReceiveParcelOrder, {
        where: { receiveId: dto.order.receive_id, del: 0 },
      });

      if (!receive) {
        return { flag: false, ms: 'ไม่พบข้อมูลการรับพัสดุ' };
      }

      receive.receiveStatus = dto.order.receive_status;
      await manager.save(ReceiveParcelOrder, receive);

      for (const detail of dto.detail) {
        // NOTE: tb_transaction_supplies ไม่มีคอลัมน์ sc_id — วัสดุผูกโรงเรียนผ่าน supp_id
        // (tb_supplies.sc_id) จึงกรองด้วย supp_id พอ ไม่ต้องกรอง trans.sc_id ที่ไม่มีจริง
        const lastTransaction = await manager
          .createQueryBuilder(TransactionSupplies, 'trans')
          .where('trans.supp_id = :suppId', { suppId: detail.supp_id })
          .andWhere('trans.del = 0')
          .orderBy('trans.trans_id', 'DESC')
          .getOne();

        const lastBalance = lastTransaction?.transBalance || 0;
        // M4: รับเข้า (+) ไม่ใช่จ่ายออก (-)
        const inQty = Number(detail.trans_in || 0);
        const newBalance = lastBalance + inQty;

        const transaction = manager.create(TransactionSupplies, {
          suppId: detail.supp_id,
          transIn: inQty,
          transOut: 0,
          transBalance: newBalance,
          transComment: 'รับพัสดุ',
        });

        await manager.save(TransactionSupplies, transaction);
      }

      return { flag: true };
    });
  }

  // backward-compat alias (L1: typo fix confiirmWithDrawParcel → confirmReceiveParcel)
  async confirmWithDrawParcel(dto: ConfirmWithdrawParcelDto, user?: JwtUser) {
    // Multi-tenant guard: ใบเบิก/รับพัสดุต้องเป็นของโรงเรียนผู้ใช้
    if (user && dto.order?.receive_id) {
      const receive = await this.receiveParcelOrderRepository.findOne({
        where: { receiveId: dto.order.receive_id, del: 0 },
      });
      if (receive && receive.scId != null) {
        assertSameSchool(user, receive.scId);
      }
    }
    return this.confirmReceiveParcel(dto);
  }

  private async calculateBalance(scId: number) {
    // Get latest balance for each supply
    const supplies = await this.suppliesRepository.find({
      where: { scId, del: 0 },
    });

    const balancePromises = supplies.map(async (supply) => {
      const lastTransaction = await this.transactionSuppliesRepository
        .createQueryBuilder('trans')
        .where('trans.supp_id = :suppId', { suppId: supply.suppId })
        .andWhere('trans.del = 0')
        .orderBy('trans.trans_id', 'DESC')
        .getOne();

      return {
        suppId: supply.suppId,
        transBalance: lastTransaction?.transBalance || 0,
      };
    });

    return Promise.all(balancePromises);
  }

  private async calculateBalanceMap(
    scId: number,
  ): Promise<Map<number, number>> {
    const balance = await this.calculateBalance(scId);
    const map = new Map<number, number>();
    balance.forEach((b) => {
      map.set(b.suppId, b.transBalance);
    });
    return map;
  }
}
