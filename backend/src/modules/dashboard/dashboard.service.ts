import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { School } from '../school/entities/school.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
  ) {}

  loadChartBudgetTypePie(_scId: number, _year?: number) {
    // TODO: Implement pie chart data logic
    // This should query budget data and group by type
    return {
      data: [],
      labels: [],
    };
  }

  loadChartBudgetTypeBar(_scId: number, _year?: number) {
    // TODO: Implement bar chart data logic
    return {
      data: [],
      labels: [],
    };
  }

  predictBudget(_scId: number, _year: string) {
    // TODO: Implement budget prediction logic
    return {
      predicted: 0,
      actual: 0,
      difference: 0,
    };
  }

  async loadDashboard(scId: number) {
    // Get current school year
    const currentYear = await this.schoolYearRepository.findOne({
      where: { scId, del: 0 },
      order: { syId: 'DESC' },
    });

    // TODO: Calculate budget data
    const budgetReceived = 0;
    const budgetAnnual = 0;
    const disbursement = 0;
    const remaining = 0;

    return {
      budgetReceived,
      budgetAnnual,
      disbursement,
      remaining,
      currentYear: currentYear
        ? {
            sy_id: currentYear.syId,
            sy_year: currentYear.syYear,
            budget_year: currentYear.budgetYear,
          }
        : null,
    };
  }

  getRound() {
    // TODO: Implement round data
    return {
      rounds: [],
    };
  }
}
