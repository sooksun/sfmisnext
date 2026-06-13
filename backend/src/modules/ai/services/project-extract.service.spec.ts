import { Test, TestingModule } from '@nestjs/testing';
import { ProjectExtractService } from './project-extract.service';
import { AiRouterService } from '../ai-router.service';

function mockRouter(content: string) {
  return {
    chat: jest.fn().mockResolvedValue({
      content,
      provider: 'openrouter',
      model: 'test',
    }),
  };
}

async function build(content: string) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ProjectExtractService,
      { provide: AiRouterService, useValue: mockRouter(content) },
    ],
  }).compile();
  return module.get(ProjectExtractService);
}

describe('ProjectExtractService', () => {
  const baseDto = {
    sc_id: 1,
    sy_id: 2,
    budget_year: 2569,
    policies: [
      { scp_id: 3, name: 'นำ AI มาใช้' },
      { scp_id: 2, name: 'สถานศึกษาปลอดภัย' },
    ],
    budget_types: ['เงินอุดหนุนรายหัว'],
  };

  it('สกัดฟิลด์ + วันที่ไทยจากข้อความ override ค่าจาก AI', async () => {
    // AI ตอบวันผิด แต่ extractThaiDates ต้อง override จากข้อความจริง
    const svc = await build(
      JSON.stringify({
        proj_name: 'โครงการอบรม AI',
        proj_detail: 'อบรมครู',
        policy_ids: [3],
        proj_budget_type: 'เงินอุดหนุนรายหัว',
        start_date: '2026-10-01',
        end_date: '2027-09-30',
        proj_budget: 25000,
        questions: [],
      }),
    );
    const res = await svc.parse({
      ...baseDto,
      text: 'โครงการอบรม AI เริ่ม 1 พฤษภาคม 2569 ถึง 30 มิถุนายน 2569 วงเงิน 25000',
    });
    expect(res.flag).toBe(true);
    expect(res.data?.fields.start_date).toBe('2026-05-01');
    expect(res.data?.fields.end_date).toBe('2026-06-30');
    expect(res.data?.fields.proj_budget).toBe(25000);
    expect(res.data?.fields.policy_ids).toEqual([3]);
    expect(res.data?.fields.proj_budget_type).toBe('เงินอุดหนุนรายหัว');
  });

  it('กรอง policy id ที่ไม่มีในรายการ + budget_type ที่ไม่ตรงทิ้ง', async () => {
    const svc = await build(
      JSON.stringify({
        proj_name: 'x',
        policy_ids: [3, 999], // 999 ไม่มีจริง
        proj_budget_type: 'เงินมั่ว', // ไม่อยู่ในรายการ
        questions: [],
      }),
    );
    const res = await svc.parse({ ...baseDto, text: 'x' });
    expect(res.data?.fields.policy_ids).toEqual([3]);
    expect(res.data?.fields.proj_budget_type).toBeNull();
  });

  it('รับวันที่รูปแบบตัวเลข dd/mm/yyyy (พ.ศ.)', async () => {
    const svc = await build(JSON.stringify({ proj_name: 'y', questions: [] }));
    const res = await svc.parse({
      ...baseDto,
      text: 'โครงการ y เริ่ม 15/11/2568 ถึง 20/01/2569',
    });
    expect(res.data?.fields.start_date).toBe('2025-11-15');
    expect(res.data?.fields.end_date).toBe('2026-01-20');
  });

  it('ส่งคำถามกลับเมื่อ AI ระบุ questions', async () => {
    const svc = await build(
      JSON.stringify({
        proj_name: 'z',
        questions: [{ field: 'proj_budget_type', question: 'ใช้งบประเภทใด?' }],
      }),
    );
    const res = await svc.parse({ ...baseDto, text: 'z' });
    expect(res.data?.questions).toHaveLength(1);
    expect(res.data?.questions[0].field).toBe('proj_budget_type');
  });

  it('AI ตอบไม่เป็น JSON → flag:false', async () => {
    const svc = await build('ขอโทษครับ ไม่เข้าใจ');
    const res = await svc.parse({ ...baseDto, text: 'อะไรสักอย่าง' });
    expect(res.flag).toBe(false);
  });
});
