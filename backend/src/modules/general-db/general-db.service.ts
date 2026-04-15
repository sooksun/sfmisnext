import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { TypeSupplies } from './entities/type-supplies.entity';
import { Partner } from './entities/partner.entity';
import { Supplies } from '../supplie/entities/supplies.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateTypeSuppliesDto } from './dto/create-type-supplies.dto';
import { UpdateTypeSuppliesDto } from './dto/update-type-supplies.dto';

export interface AddPartnerPayload {
  p_name: string;
  p_address?: string | null;
  p_tel?: string | null;
  p_tax?: string | null;
  sc_id?: number | null;
  up_by?: number | null;
}

export interface UpdatePartnerPayload {
  p_id: number;
  p_name?: string;
  p_address?: string | null;
  p_tel?: string | null;
  p_tax?: string | null;
  sc_id?: number | null;
  up_by?: number | null;
}

export interface ImgPayload {
  valid: boolean;
  data: string;
  type: string;
}

export interface AddSuppliePayload {
  supp_no: string;
  supp_name: string;
  supp_price?: number | null;
  ts_id?: number;
  un_id?: number;
  supp_detail?: string | null;
  supp_address?: string | null;
  supp_cap_max?: number;
  supp_cap_min?: number;
  sc_id?: number | null;
  up_by?: number | null;
  img?: ImgPayload;
}

export interface UpdateSuppliesPayload {
  supp_id: number;
  supp_no?: string;
  supp_name?: string;
  supp_price?: number | null;
  ts_id?: number;
  un_id?: number;
  supp_detail?: string | null;
  supp_address?: string | null;
  supp_cap_max?: number;
  supp_cap_min?: number;
  sc_id?: number | null;
  up_by?: number | null;
  img?: ImgPayload;
}

export interface FixSuppliesPayload {
  supp_id: number;
  trans_in?: number;
  trans_out?: number;
  trans_comment?: string | null;
  up_by?: number | null;
}

@Injectable()
export class GeneralDbService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(TypeSupplies)
    private readonly typeSuppliesRepository: Repository<TypeSupplies>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Supplies)
    private readonly suppliesRepository: Repository<Supplies>,
    @InjectRepository(TransactionSupplies)
    private readonly transactionSuppliesRepository: Repository<TransactionSupplies>,
  ) {}

  // Unit methods
  async loadUnits(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.unitRepository.findAndCount({
      where: { scId, uStatus: 1 },
      order: { unId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((u) => ({
        un_id: u.unId,
        un_name: u.unName,
        sc_id: u.scId,
        u_status: u.uStatus,
        up_by: u.upBy,
        create_date: u.createDate,
        update_date: u.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addUnit(payload: CreateUnitDto) {
    const unit = new Unit();
    unit.unName = payload.un_name;
    unit.scId = payload.sc_id ?? 0;
    unit.upBy = payload.up_by ?? 0;
    unit.uStatus = 1;

    await this.unitRepository.save(unit);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateUnit(payload: UpdateUnitDto) {
    const unit = await this.unitRepository.findOne({
      where: { unId: payload.un_id, uStatus: 1 },
    });

    if (!unit) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    if (payload.un_name !== undefined) unit.unName = payload.un_name;
    if (payload.sc_id !== undefined) unit.scId = payload.sc_id;
    if (payload.u_status !== undefined) unit.uStatus = payload.u_status;
    if (payload.up_by !== undefined) unit.upBy = payload.up_by;

    unit.updateDate = new Date();
    await this.unitRepository.save(unit);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeUnit(unId: number) {
    const unit = await this.unitRepository.findOne({
      where: { unId, uStatus: 1 },
    });

    if (!unit) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    unit.uStatus = 0;
    await this.unitRepository.save(unit);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  // TypeSupplies methods
  async loadTypeSupplies(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.typeSuppliesRepository.findAndCount({
      where: { scId, del: 0 },
      order: { tsId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((ts) => ({
        ts_id: ts.tsId,
        ts_name: ts.tsName,
        sc_id: ts.scId,
        del: ts.del,
        up_by: ts.upBy,
        create_date: ts.createDate,
        update_date: ts.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async addTypeSupplie(payload: CreateTypeSuppliesDto) {
    const typeSupplie = new TypeSupplies();
    typeSupplie.tsName = payload.ts_name;
    typeSupplie.scId = payload.sc_id ?? 0;
    typeSupplie.upBy = payload.up_by ?? 0;
    typeSupplie.del = 0;

    await this.typeSuppliesRepository.save(typeSupplie);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateTypeSupplie(payload: UpdateTypeSuppliesDto) {
    const typeSupplie = await this.typeSuppliesRepository.findOne({
      where: { tsId: payload.ts_id, del: 0 },
    });

    if (!typeSupplie) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    if (payload.ts_name !== undefined) typeSupplie.tsName = payload.ts_name;
    if (payload.sc_id !== undefined) typeSupplie.scId = payload.sc_id;
    if (payload.up_by !== undefined) typeSupplie.upBy = payload.up_by;

    typeSupplie.updateDate = new Date();
    await this.typeSuppliesRepository.save(typeSupplie);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeTypeSupplie(tsId: number) {
    const typeSupplie = await this.typeSuppliesRepository.findOne({
      where: { tsId, del: 0 },
    });

    if (!typeSupplie) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    typeSupplie.del = 1;
    await this.typeSuppliesRepository.save(typeSupplie);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  // Partner methods
  async loadPartners(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.partnerRepository.findAndCount({
      where: { scId, del: 0 },
      order: { pId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((p) => ({
        p_id: p.pId,
        sc_id: p.scId,
        p_type: p.pType,
        p_no: p.pNo,
        p_name: p.pName,
        pay_type: p.payType,
        payee: p.payee,
        p_address: p.pAddress,
        p_phone: p.pPhone,
        p_fax: p.pFax,
        p_id_tax: p.pIdTax,
        cal_vat: p.calVat,
        del: p.del,
        up_by: p.upBy,
        up_date: p.updateDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  async getPartners(scId: number) {
    const items = await this.partnerRepository.find({
      where: { scId, del: 0 },
      order: { pId: 'DESC' },
    });

    return items;
  }

  async addPartner(payload: AddPartnerPayload) {
    const partner = new Partner();
    partner.pName = payload.p_name;
    partner.pAddress = payload.p_address ?? null;
    partner.pTel = payload.p_tel ?? null;
    partner.pTax = payload.p_tax ?? null;
    partner.scId = payload.sc_id ?? null;
    partner.upBy = payload.up_by ?? null;
    partner.del = 0;

    await this.partnerRepository.save(partner);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updatePartner(payload: UpdatePartnerPayload) {
    const partner = await this.partnerRepository.findOne({
      where: { pId: payload.p_id, del: 0 },
    });

    if (!partner) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    if (payload.p_name !== undefined) partner.pName = payload.p_name;
    if (payload.p_address !== undefined) partner.pAddress = payload.p_address;
    if (payload.p_tel !== undefined) partner.pTel = payload.p_tel;
    if (payload.p_tax !== undefined) partner.pTax = payload.p_tax;
    if (payload.sc_id !== undefined) partner.scId = payload.sc_id;
    if (payload.up_by !== undefined) partner.upBy = payload.up_by;

    partner.updateDate = new Date();
    await this.partnerRepository.save(partner);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removePartner(partnerId: number) {
    const partner = await this.partnerRepository.findOne({
      where: { pId: partnerId, del: 0 },
    });

    if (!partner) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    partner.del = 1;
    await this.partnerRepository.save(partner);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  // Supplies methods
  async loadSupplies(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.suppliesRepository.findAndCount({
      where: { scId, del: 0 },
      order: { suppId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    // Get all unique type supplies IDs and unit IDs
    const typeSuppliesIds = [
      ...new Set(items.map((item) => item.tsId).filter((id) => id && id > 0)),
    ];
    const unitIds = [
      ...new Set(items.map((item) => item.unId).filter((id) => id && id > 0)),
    ];

    // Load all type supplies and units in parallel
    const typeSuppliesMap = new Map<number, string>();
    const unitMap = new Map<number, string>();

    await Promise.all([
      typeSuppliesIds.length > 0
        ? this.typeSuppliesRepository
            .find({ where: { tsId: In(typeSuppliesIds), del: 0 } })
            .then((rows) => rows.forEach((ts) => typeSuppliesMap.set(ts.tsId, ts.tsName)))
        : Promise.resolve(),
      unitIds.length > 0
        ? this.unitRepository
            .find({ where: { unId: In(unitIds), uStatus: 1 } })
            .then((rows) => rows.forEach((u) => unitMap.set(u.unId, u.unName)))
        : Promise.resolve(),
    ]);

    // Format response to match frontend expectations
    const formattedData = items.map((supply) => ({
      supp_id: supply.suppId,
      supp_no: supply.suppNo,
      supp_img: supply.suppImg,
      supp_name: supply.suppName,
      supp_price: supply.suppPrice,
      ts_id: supply.tsId,
      ts_name: typeSuppliesMap.get(supply.tsId) || '',
      un_id: supply.unId,
      un_name: unitMap.get(supply.unId) || '',
      supp_amount: supply.suppCapMax,   // จำนวนสต็อก (supp_cap_max)
      supp_detail: supply.suppDetail,
      supp_address: supply.suppAddress,
      supp_cap_max: supply.suppCapMax,
      supp_cap_min: supply.suppCapMin,
      sc_id: supply.scId,
      up_by: supply.upBy,
      del: supply.del,
      create_date: supply.createDate
        ? supply.createDate.toISOString().split('T')[0]
        : null,
      update_date: supply.updateDate
        ? supply.updateDate.toISOString().split('T')[0]
        : null,
    }));

    return {
      data: formattedData,
      count,
      page,
      pageSize,
    };
  }

  async addSupplie(payload: AddSuppliePayload) {
    const supplies = new Supplies();
    supplies.suppNo = payload.supp_no;
    supplies.suppName = payload.supp_name;
    supplies.suppPrice = payload.supp_price ?? null;
    supplies.tsId = payload.ts_id ?? 0;
    supplies.unId = payload.un_id ?? 0;
    supplies.suppDetail = payload.supp_detail ?? null;
    supplies.suppAddress = payload.supp_address ?? null;
    supplies.suppCapMax = payload.supp_cap_max ?? 1;
    supplies.suppCapMin = payload.supp_cap_min ?? 0;
    supplies.scId = payload.sc_id ?? null;
    supplies.upBy = payload.up_by ?? null;
    supplies.del = 0;

    // Handle image upload (base64)
    if (payload.img && payload.img.valid && payload.img.data) {
      // Save base64 image to file system or store as text
      // For now, store as base64 string
      supplies.suppImg = `data:${payload.img.type};base64,${payload.img.data}`;
    }

    await this.suppliesRepository.save(supplies);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateSupplies(payload: UpdateSuppliesPayload) {
    const supplies = await this.suppliesRepository.findOne({
      where: { suppId: payload.supp_id, del: 0 },
    });

    if (!supplies) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    if (payload.supp_no !== undefined) supplies.suppNo = payload.supp_no;
    if (payload.supp_name !== undefined) supplies.suppName = payload.supp_name;
    if (payload.supp_price !== undefined)
      supplies.suppPrice = payload.supp_price;
    if (payload.ts_id !== undefined) supplies.tsId = payload.ts_id;
    if (payload.un_id !== undefined) supplies.unId = payload.un_id;
    if (payload.supp_detail !== undefined)
      supplies.suppDetail = payload.supp_detail;
    if (payload.supp_address !== undefined)
      supplies.suppAddress = payload.supp_address;
    if (payload.supp_cap_max !== undefined)
      supplies.suppCapMax = payload.supp_cap_max;
    if (payload.supp_cap_min !== undefined)
      supplies.suppCapMin = payload.supp_cap_min;
    if (payload.sc_id !== undefined) supplies.scId = payload.sc_id;
    if (payload.up_by !== undefined) supplies.upBy = payload.up_by;

    // Handle image upload (base64)
    if (payload.img && payload.img.valid && payload.img.data) {
      supplies.suppImg = `data:${payload.img.type};base64,${payload.img.data}`;
    }

    supplies.updateDate = new Date();
    await this.suppliesRepository.save(supplies);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeSupplies(payload: { supp_id: number; del?: number }) {
    const supplies = await this.suppliesRepository.findOne({
      where: { suppId: payload.supp_id, del: 0 },
    });

    if (!supplies) {
      return { flag: false, ms: 'ไม่พบข้อมูล' };
    }

    supplies.del = payload.del ?? 1;
    supplies.updateDate = new Date();
    await this.suppliesRepository.save(supplies);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  async loadTypeSuppliesAndUnit(scId: number) {
    const [typeSupplies, units] = await Promise.all([
      this.typeSuppliesRepository.find({
        where: { scId, del: 0 },
        order: { tsId: 'ASC' },
      }),
      this.unitRepository.find({
        where: { scId, uStatus: 1 },
        order: { unId: 'ASC' },
      }),
    ]);

    return {
      typeSupplies: typeSupplies.map((ts) => ({
        ts_id: ts.tsId,
        ts_name: ts.tsName,
        sc_id: ts.scId,
        del: ts.del,
      })),
      units: units.map((u) => ({
        un_id: u.unId,
        un_name: u.unName,
        sc_id: u.scId,
      })),
    };
  }

  async loadFixSupplies(suppId: number, page: number, pageSize: number) {
    const [items, count] =
      await this.transactionSuppliesRepository.findAndCount({
        where: { suppId, del: 0 },
        order: { transId: 'DESC' },
        skip: page * pageSize,
        take: pageSize,
      });

    return {
      data: items,
      count,
      page,
      pageSize,
    };
  }

  async fixSupplies(payload: FixSuppliesPayload) {
    const { supp_id, trans_in, trans_out, trans_comment, up_by } = payload;

    // Get last transaction balance
    const lastTransaction = await this.transactionSuppliesRepository.findOne({
      where: { suppId: supp_id, del: 0 },
      order: { transId: 'DESC' },
    });

    const lastBalance = lastTransaction ? lastTransaction.transBalance : 0;
    const newBalance = lastBalance + (trans_in ?? 0) - (trans_out ?? 0);

    // Create new transaction
    const transaction = new TransactionSupplies();
    transaction.suppId = supp_id;
    transaction.transIn = trans_in ?? 0;
    transaction.transOut = trans_out ?? 0;
    transaction.transBalance = newBalance;
    transaction.transComment = trans_comment ?? null;
    transaction.upBy = up_by ?? null;
    transaction.del = 0;

    await this.transactionSuppliesRepository.save(transaction);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }
}
