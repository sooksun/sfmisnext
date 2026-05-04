import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

export type SearchResultType = 'receipt' | 'check' | 'invoice';

export interface SearchResult {
  type: SearchResultType;
  id: number;
  doc_no: string;
  date: string | null;
  amount: number;
  detail: string;
}

@Injectable()
export class GlobalSearchService {
  constructor(
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
  ) {}

  async search(scId: number, q: string, limit = 20): Promise<SearchResult[]> {
    if (!q || q.trim().length < 1) return [];

    const term = q.trim();
    const likePattern = `%${term}%`;
    const results: SearchResult[] = [];

    // ── 1. Search RequestWithdraw (invoice + check documents) ────────────────
    const rwRows = await this.requestWithdrawRepository
      .createQueryBuilder('rw')
      .where('rw.sc_id = :scId', { scId })
      .andWhere('rw.del = :del', { del: 0 })
      .andWhere(
        '(rw.no_doc LIKE :like OR rw.check_no_doc LIKE :like OR rw.detail LIKE :like)',
        { like: likePattern },
      )
      .orderBy('rw.create_date', 'DESC')
      .take(limit)
      .getMany();

    for (const rw of rwRows) {
      // Distinguish invoice vs check by whether check_no_doc is populated
      const isCheck = !!(rw.checkNoDoc && rw.checkNoDoc.trim());
      const docNo = isCheck
        ? (rw.checkNoDoc ?? rw.noDoc ?? '')
        : (rw.noDoc ?? '');
      const dateVal = rw.dateRequest
        ? new Date(rw.dateRequest).toISOString().split('T')[0]
        : rw.createDate
          ? new Date(rw.createDate).toISOString().split('T')[0]
          : null;

      results.push({
        type: isCheck ? 'check' : 'invoice',
        id: rw.rwId,
        doc_no: docNo,
        date: dateVal,
        amount: rw.amount ?? 0,
        detail: rw.detail ?? '',
      });
    }

    // ── 2. Search PlnReceive (receipt documents) ──────────────────────────────
    const prRows = await this.plnReceiveRepository
      .createQueryBuilder('pr')
      .where('pr.sc_id = :scId', { scId })
      .andWhere('pr.del = :del', { del: 0 })
      .andWhere('pr.pr_no LIKE :like', { like: likePattern })
      .orderBy('pr.receive_date', 'DESC')
      .take(limit)
      .getMany();

    for (const pr of prRows) {
      const dateVal = pr.receiveDate
        ? new Date(pr.receiveDate).toISOString().split('T')[0]
        : pr.createDate
          ? new Date(pr.createDate).toISOString().split('T')[0]
          : null;

      // Get total amount from financial_transactions linked to this receive
      const ftRow = await this.financialTransactionsRepository
        .createQueryBuilder('ft')
        .select('SUM(ft.amount)', 'total')
        .where('ft.sc_id = :scId', { scId })
        .andWhere('ft.pr_id = :prId', { prId: pr.prId })
        .andWhere('ft.del = :del', { del: '0' })
        .getRawOne<{ total: string }>();

      const amount = parseFloat(ftRow?.total ?? '0');

      results.push({
        type: 'receipt',
        id: pr.prId,
        doc_no: pr.prNo ?? '',
        date: dateVal,
        amount,
        detail: pr.receiveForm ?? '',
      });
    }

    // ── De-duplicate by (type + id), sort by date DESC ────────────────────────
    const seen = new Set<string>();
    const unique: SearchResult[] = [];
    for (const r of results) {
      const key = `${r.type}:${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    unique.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    return unique.slice(0, limit);
  }
}
