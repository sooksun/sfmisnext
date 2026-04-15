import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WithholdingCertificate } from './entities/withholding-certificate.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Partner } from '../general-db/entities/partner.entity';

@Injectable()
export class RegistrationCertificateService {
  constructor(
    @InjectRepository(WithholdingCertificate)
    private readonly withholdingCertificateRepository: Repository<WithholdingCertificate>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
  ) {}

  // ── CRUD สำหรับ Withholding_certificate ────────────────────────────────────

  async loadWithholdingCertificateList(scId: number, syId: number) {
    const certs = await this.withholdingCertificateRepository.find({
      where: { scId, syId, del: 0 },
      order: { wcId: 'DESC' },
    });
    if (certs.length === 0) return [];

    const ofIds = [...new Set(certs.map((c) => c.ofId).filter((id) => id > 0))];
    let withdraws: RequestWithdraw[] = [];
    if (ofIds.length > 0) {
      withdraws = await this.requestWithdrawRepository.find({
        where: { rwId: In(ofIds) },
      });
    }

    const pIds = [...new Set(withdraws.map((w) => w.pId).filter((id) => id > 0))];
    let partners: Partner[] = [];
    if (pIds.length > 0) {
      partners = await this.partnerRepository.find({ where: { pId: In(pIds) } });
    }

    const wMap = new Map(withdraws.map((w) => [w.rwId, w]));
    const pMap = new Map(partners.map((p) => [p.pId, p]));

    return certs.map((cert) => {
      const w = wMap.get(cert.ofId);
      const p = w ? pMap.get(w.pId) : null;
      const amount = w ? Number(w.amount) : 0;
      const calVat = p ? p.calVat : 2;

      let deduct = 0;
      if (calVat === 1) {
        const vat = amount - (amount * 7) / 107;
        deduct = vat * 0.01;
      } else {
        deduct = amount * 0.01;
      }

      return {
        wc_id: cert.wcId,
        wc_no: cert.wcNo ?? '',
        of_id: cert.ofId,
        wc_rank: cert.wcRank ?? 0,
        cer_date: cert.cerDate,
        sy_id: cert.syId,
        year: cert.year ?? '',
        status: cert.status,
        detail: w?.detail ?? '',
        p_name: p?.pName ?? '',
        amount,
        deduct,
        update_date: cert.updateDate,
      };
    });
  }

  async loadCheckForWC(scId: number, syId: number) {
    const rows = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .leftJoin('tb_partner', 'p', 'p.p_id = rw.p_id')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.sy_id = :syId', { syId })
      .andWhere('rw.del = 0')
      .andWhere('rw.status IN (:...statuses)', { statuses: [200, 202] })
      .select('rw.rw_id', 'of_id')
      .addSelect('rw.no_doc', 'of_no')
      .addSelect('rw.detail', 'detail')
      .addSelect('p.p_name', 'p_name')
      .addSelect('p.p_address', 'p_address')
      .addSelect('p.p_id_tax', 'p_id_tax')
      .addSelect('rw.amount', 'amount')
      .addSelect('p.cal_vat', 'cal_vat')
      .orderBy('rw.rw_id', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      of_id: r.of_id,
      of_no: r.of_no ?? '',
      detail: r.detail ?? '',
      p_name: r.p_name ?? '',
      p_address: r.p_address ?? '',
      p_id_tax: r.p_id_tax ?? '',
      amount: Number(r.amount ?? 0),
      cal_vat: Number(r.cal_vat ?? 2),
    }));
  }

  async addWithholdingCertificate(dto: {
    wc_no: string;
    of_id: number;
    sc_id: number;
    wc_rank: number;
    cer_date: string;
    sy_id: number;
    year: string;
    status?: number;
    up_by?: number;
  }) {
    const cert = this.withholdingCertificateRepository.create({
      wcNo: dto.wc_no,
      ofId: dto.of_id,
      scId: dto.sc_id,
      wcRank: dto.wc_rank,
      cerDate: dto.cer_date as any,
      syId: dto.sy_id,
      year: dto.year,
      status: dto.status ?? 100,
      del: 0,
      upBy: dto.up_by ?? 0,
    });
    await this.withholdingCertificateRepository.save(cert);
    return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
  }

  async updateWithholdingCertificate(dto: {
    wc_id: number;
    wc_no?: string;
    of_id?: number;
    wc_rank?: number;
    cer_date?: string;
    status?: number;
    del?: number;
    up_by?: number;
  }) {
    const cert = await this.withholdingCertificateRepository.findOne({
      where: { wcId: dto.wc_id, del: 0 },
    });
    if (!cert) return { flag: false, ms: 'ไม่พบข้อมูล' };

    if (dto.del === 1) {
      cert.del = 1;
      await this.withholdingCertificateRepository.save(cert);
      return { flag: true, ms: 'ลบเรียบร้อยแล้ว' };
    }

    if (dto.wc_no !== undefined) cert.wcNo = dto.wc_no;
    if (dto.of_id !== undefined) cert.ofId = dto.of_id;
    if (dto.wc_rank !== undefined) cert.wcRank = dto.wc_rank;
    if (dto.cer_date !== undefined) cert.cerDate = dto.cer_date as any;
    if (dto.status !== undefined) cert.status = dto.status;
    if (dto.up_by !== undefined) cert.upBy = dto.up_by;

    await this.withholdingCertificateRepository.save(cert);
    return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
  }

  async loadRegistrationCertificate(scId: number, year: string) {
    // Handle year format - convert to string if needed
    const yearStr = year ? String(year) : '';

    // Load withholding certificates
    const certificates = await this.withholdingCertificateRepository.find({
      where: {
        scId,
        year: yearStr,
        del: 0,
      },
      order: { wcId: 'DESC' },
    });

    // Return empty array if no certificates found
    if (certificates.length === 0) {
      console.log(`No certificates found for scId: ${scId}, year: ${yearStr}`);
      return [];
    }

    // Load related data (request_withdraw and partner)
    const ofIds = [
      ...new Set(certificates.map((c) => c.ofId).filter((id) => id > 0)),
    ];

    let withdraws: RequestWithdraw[] = [];
    let partners: Partner[] = [];

    if (ofIds.length > 0) {
      withdraws = await this.requestWithdrawRepository.find({
        where: { rwId: In(ofIds) },
      });

      const partnerIds = [
        ...new Set(withdraws.map((w) => w.pId).filter((id) => id > 0)),
      ];
      if (partnerIds.length > 0) {
        partners = await this.partnerRepository.find({
          where: { pId: In(partnerIds) },
        });
      }
    }

    const withdrawMap = new Map<number, RequestWithdraw>();
    withdraws.forEach((w) => withdrawMap.set(w.rwId, w));

    const partnerMap = new Map<number, Partner>();
    partners.forEach((p) => partnerMap.set(p.pId, p));

    return certificates.map((cert) => {
      const withdraw = withdrawMap.get(cert.ofId);
      const partner = withdraw ? partnerMap.get(withdraw.pId) : null;

      return {
        wc_id: cert.wcId,
        wc_no: cert.wcNo,
        of_id: cert.ofId,
        sc_id: cert.scId,
        wc_rank: cert.wcRank,
        cer_date: cert.cerDate,
        sy_id: cert.syId,
        year: cert.year,
        status: cert.status,
        detail: withdraw ? withdraw.detail : '',
        partner_name: partner ? partner.pName : '',
        amount: withdraw ? withdraw.amount : 0,
        certificate_payment: withdraw ? withdraw.certificatePayment : null,
      };
    });
  }
}
