import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlnReceive } from './entities/pln-receive.entity';
import { PlnReceiveDetail } from './entities/pln-receive-detail.entity';
import { AddReceiveDto } from './dto/add-receive.dto';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class ReceiveService {
  constructor(
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  async loadReceive(scId: number, syId: number, budgetYear: string) {
    const receives = await this.plnReceiveRepository.find({
      where: {
        scId,
        syId,
        budgetYear,
        del: 0,
      },
      order: { prId: 'DESC' },
    });

    const result = await Promise.all(
      receives.map(async (receive) => {
        const details = await this.plnReceiveDetailRepository.find({
          where: {
            prId: receive.prId,
            del: 0,
          },
        });

        const totalBudget = details.reduce(
          (sum, detail) => sum + (detail.prdBudget || 0),
          0,
        );

        // Lookup budget type name
        let budgetTypeName = '';
        if (receive.receiveMoneyType) {
          const bt = await this.budgetIncomeTypeRepository.findOne({
            where: { bgTypeId: receive.receiveMoneyType },
          });
          if (bt) budgetTypeName = bt.budgetType;
        }

        return {
          pr_id: receive.prId,
          rw_id: receive.prId,
          pr_no: receive.prNo,
          sc_id: receive.scId,
          receive_form: receive.receiveForm,
          sy_id: receive.syId,
          budget_year: receive.budgetYear,
          user_receive: receive.userReceive,
          receive_money_type: receive.receiveMoneyType,
          budget_type_id: receive.receiveMoneyType,
          budget_type_name: budgetTypeName,
          receive_date: receive.receiveDate,
          amount: totalBudget,
          note: receive.receiveForm,
          cf_transaction: receive.cfTransaction,
          up_by: receive.upBy,
          up_date: receive.updateDate,
          del: receive.del,
          create_date: receive.createDate,
          update_date: receive.updateDate,
          total_budget: totalBudget,
          pln_receive_detail: {
            data: details.map((detail) => ({
              prd_id: detail.prdId,
              pr_id: detail.prId,
              bg_type_id: detail.bgTypeId,
              prd_detail: detail.prdDetail,
              prd_budget: detail.prdBudget,
              up_by: detail.upBy,
              del: detail.del,
              create_date: detail.createDate,
              update_date: detail.updateDate,
            })),
          },
        };
      }),
    );

    return result;
  }

  async loadAutoAddReceive(scId: number, syId: number) {
    // Get the last pr_no for this school and year
    const lastReceive = await this.plnReceiveRepository.findOne({
      where: {
        scId,
        syId,
        del: 0,
      },
      order: { prId: 'DESC' },
    });

    let nextPrNo = 1;
    if (lastReceive && lastReceive.prNo) {
      // Try to parse the last pr_no as number
      const lastPrNo = parseInt(lastReceive.prNo, 10);
      if (!isNaN(lastPrNo)) {
        nextPrNo = lastPrNo + 1;
      }
    }

    return { pr_no: nextPrNo };
  }

  async loadDirector(scId: number) {
    // Load admin users with type = 8 (หัวหน้าการเงิน)
    const directors = await this.adminRepository.find({
      where: {
        scId,
        type: 8,
        del: 0,
      },
      order: { adminId: 'ASC' },
    });

    return directors.map((admin) => ({
      admin_id: admin.adminId,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      type: admin.type,
      sc_id: admin.scId,
    }));
  }

  async loadBudgetIncomeType() {
    const items = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return items.map((item) => ({
      bg_type_id: item.bgTypeId,
      budget_type_id: item.bgTypeId,
      budget_type: item.budgetType,
      budget_type_name: item.budgetType,
      del: item.del,
    }));
  }

  async addReceive(dto: AddReceiveDto) {
    // Create or update pln_receive
    let receive: PlnReceive;
    if (dto.pr_id && dto.pr_id > 0) {
      const foundReceive = await this.plnReceiveRepository.findOne({
        where: { prId: dto.pr_id, del: 0 },
      });
      if (!foundReceive) {
        return { flag: false, ms: 'ไม่พบข้อมูลการรับเงิน' };
      }
      receive = foundReceive;
    } else {
      receive = this.plnReceiveRepository.create({});
    }

    receive.prNo = dto.pr_no ?? null;
    receive.scId = dto.sc_id;
    receive.receiveForm = dto.receive_form ?? dto.note ?? null;
    receive.syId = dto.sy_id;
    receive.budgetYear = dto.budget_year;
    receive.userReceive = dto.user_receive ?? 0;
    // Support both receive_money_type and budget_type_id from frontend
    receive.receiveMoneyType =
      dto.receive_money_type ?? dto.budget_type_id ?? 0;
    receive.receiveDate = new Date(dto.receive_date);
    receive.cfTransaction = dto.cf_transaction ?? 0;
    receive.upBy = dto.up_by ?? null;

    await this.plnReceiveRepository.save(receive);

    // Handle receive details - support both receiveList array and flat amount
    const receiveList = dto.receiveList ?? [];

    // If no receiveList but amount + budget_type_id provided (from simple frontend form),
    // auto-create a single detail record
    if (receiveList.length === 0 && dto.amount && receive.receiveMoneyType) {
      const detail = this.plnReceiveDetailRepository.create({
        prId: receive.prId,
      });
      detail.bgTypeId = receive.receiveMoneyType;
      detail.prdDetail = receive.receiveForm ?? null;
      detail.prdBudget = Number(dto.amount);
      detail.upBy = receive.upBy ?? null;
      await this.plnReceiveDetailRepository.save(detail);
    }

    if (receiveList.length > 0) {
      for (const detailItem of receiveList) {
        let detail: PlnReceiveDetail;
        if (detailItem.prd_id && detailItem.prd_id > 0) {
          const foundDetail = await this.plnReceiveDetailRepository.findOne({
            where: { prdId: detailItem.prd_id, del: 0 },
          });
          if (!foundDetail) {
            continue;
          }
          detail = foundDetail;
        } else {
          detail = this.plnReceiveDetailRepository.create({
            prId: receive.prId,
          });
        }

        detail.bgTypeId = detailItem.bg_type_id;
        detail.prdDetail = detailItem.prd_detail || null;
        detail.prdBudget = detailItem.prd_budget;
        detail.upBy = detailItem.up_by ?? null;

        await this.plnReceiveDetailRepository.save(detail);
      }
    }

    // Handle deleted details
    if (dto.receiveList_del && dto.receiveList_del.length > 0) {
      for (const detailItem of dto.receiveList_del) {
        if (detailItem.prd_id && detailItem.prd_id > 0) {
          const detail = await this.plnReceiveDetailRepository.findOne({
            where: { prdId: detailItem.prd_id, del: 0 },
          });
          if (detail) {
            detail.del = 1;
            await this.plnReceiveDetailRepository.save(detail);
          }
        }
      }
    }

    return { flag: true };
  }
}
