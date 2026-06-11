/**
 * ประเภทผลการประเมินอัตโนมัติของ Rule Engine
 */
export type AutoResult = 'yes' | 'no' | 'na' | 'unknown';

export interface EvalOutcome {
  result: AutoResult;
  detail: string;
}

export interface AssessContext {
  scId: number;
  syId: number;
  budgetYear: string;
}

/** map: item_code → ผลการประเมิน */
export type EvalMap = Record<string, EvalOutcome>;
