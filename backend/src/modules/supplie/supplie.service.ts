import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { Supplies } from './entities/supplies.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { Admin } from '../admin/entities/admin.entity';
import { EditReceiveParcelDto } from './dto/edit-receive-parcel.dto';
import { UpdateSupplieOrderDto } from './dto/update-supplie-order.dto';
import { ConfirmWithdrawParcelDto } from './dto/confirm-withdraw-parcel.dto';
import { LoadStockSupplieDto } from './dto/load-stock-supplie.dto';

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

    return receives.map((receive) => ({
      receive_id: receive.receiveId,
      admin_id: receive.adminId,
      agent_admin_id: receive.agentAdminId,
      user_pacel_id: receive.userPacelId,
      sc_id: receive.scId,
      order_id: receive.orderId,
      sy_year: receive.syYear,
      title: receive.title,
      del: receive.del,
      receive_date: receive.receiveDate,
      receive_status: receive.receiveStatus,
      create_date: receive.createDate,
      update_date: receive.updateDate,
      add: false,
    }));
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

    const result = await Promise.all(
      orders.map(async (order) => {
        const details = await this.parcelDetailRepository.find({
          where: {
            orderId: order.orderId,
            del: 0,
          },
        });

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
      }),
    );

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

  async loadParcelDetail(orderId: number) {
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

    // Calculate balance for each supply
    const balance = await this.calculateBalance(scId);

    return {
      parcel_detail: parcelDetails.map((pd) => {
        const rp = receiveDetails.find((rd) => rd.suppId === pd.suppId);
        return {
          pc_id: pd.pcId,
          order_id: pd.orderId,
          supp_id: pd.suppId,
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
    // Load parcel orders that need approval (status = 4 = พัสดุ)
    const orders = await this.parcelOrderRepository.find({
      where: {
        scId,
        acadYear: yearId,
        del: 0,
        orderStatus: 4,
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
    // Create or update receive_parcel_order
    let receive: ReceiveParcelOrder;
    if (dto.receive_id && dto.receive_id > 0) {
      const foundReceive = await this.receiveParcelOrderRepository.findOne({
        where: { receiveId: dto.receive_id, del: 0 },
      });
      if (!foundReceive) {
        return { flag: false, ms: 'ไม่พบข้อมูลการเบิกพัสดุ' };
      }
      receive = foundReceive;
    } else {
      receive = this.receiveParcelOrderRepository.create({});
    }

    receive.adminId = dto.admin_id;
    receive.agentAdminId = dto.agent || 0;
    receive.scId = dto.sc_id;
    receive.orderId = dto.order_id;
    receive.syYear = dto.sy_year;
    receive.title = dto.title;
    receive.receiveDate = new Date(dto.receive_date);
    receive.receiveStatus = 1; // กำลังรออนุมัติ

    await this.receiveParcelOrderRepository.save(receive);

    // Handle receive details
    if (dto.cart && dto.cart.length > 0) {
      for (const cartItem of dto.cart) {
        let detail: ReceiveParcelDetail;
        if (cartItem.rp_id && cartItem.rp_id > 0) {
          const foundDetail = await this.receiveParcelDetailRepository.findOne({
            where: { rpId: cartItem.rp_id, del: 0 },
          });
          if (!foundDetail) {
            continue;
          }
          detail = foundDetail;
        } else {
          detail = this.receiveParcelDetailRepository.create({
            receiveId: receive.receiveId,
          });
        }

        detail.suppId = cartItem.supp_id;
        detail.rpTotal = cartItem.receive;

        await this.receiveParcelDetailRepository.save(detail);
      }
    }

    // Handle deleted details
    if (dto.cart_receive_del && dto.cart_receive_del.length > 0) {
      for (const cartItem of dto.cart_receive_del) {
        if (cartItem.rp_id && cartItem.rp_id > 0) {
          const detail = await this.receiveParcelDetailRepository.findOne({
            where: { rpId: cartItem.rp_id, del: 0 },
          });
          if (detail) {
            detail.del = 1;
            await this.receiveParcelDetailRepository.save(detail);
          }
        }
      }
    }

    return { flag: true };
  }

  async removeReceiveParcel(receiveId: number) {
    const receive = await this.receiveParcelOrderRepository.findOne({
      where: { receiveId, del: 0 },
    });

    if (!receive) {
      return { flag: false, ms: 'ไม่พบข้อมูลการเบิกพัสดุ' };
    }

    receive.del = 1;
    await this.receiveParcelOrderRepository.save(receive);

    return { flag: true };
  }

  async updateSupplieOrder(dto: UpdateSupplieOrderDto) {
    const order = await this.parcelOrderRepository.findOne({
      where: { orderId: dto.order_id, del: 0 },
    });

    if (!order) {
      return { flag: false, ms: 'ไม่พบข้อมูลคำสั่งซื้อ' };
    }

    if (dto.order_status !== undefined) order.orderStatus = dto.order_status;
    if (dto.remark !== undefined) order.remark = dto.remark;
    if (dto.due_date !== undefined) order.dueDate = new Date(dto.due_date);

    await this.parcelOrderRepository.save(order);

    return { flag: true };
  }

  async confirmWithDrawParcel(dto: ConfirmWithdrawParcelDto) {
    const receive = await this.receiveParcelOrderRepository.findOne({
      where: { receiveId: dto.order.receive_id, del: 0 },
    });

    if (!receive) {
      return { flag: false, ms: 'ไม่พบข้อมูลการเบิกพัสดุ' };
    }

    // Update receive status
    receive.receiveStatus = dto.order.receive_status;
    await this.receiveParcelOrderRepository.save(receive);

    // Create transactions
    for (const detail of dto.detail) {
      // Get last balance for this supply
      const lastTransaction = await this.transactionSuppliesRepository
        .createQueryBuilder('trans')
        .where('trans.supp_id = :suppId', { suppId: detail.supp_id })
        .andWhere('trans.del = 0')
        .orderBy('trans.trans_id', 'DESC')
        .getOne();

      const lastBalance = lastTransaction?.transBalance || 0;
      const newBalance = lastBalance - detail.trans_out;

      const transaction = this.transactionSuppliesRepository.create({
        suppId: detail.supp_id,
        transIn: detail.trans_in,
        transOut: detail.trans_out,
        transBalance: newBalance,
        transComment: 'เบิกพัสดุ',
      });

      await this.transactionSuppliesRepository.save(transaction);
    }

    return { flag: true };
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
