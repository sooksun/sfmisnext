export class AddGovRevenueDto {
  sc_id: number;
  sy_id: number;
  budget_year: string;
  revenue_type: number;
  entry_type: number; // 1=รับ 2=นำส่ง
  doc_no?: string;
  doc_date?: string;
  detail?: string;
  amount: number;
  note?: string;
  up_by?: number;
}
