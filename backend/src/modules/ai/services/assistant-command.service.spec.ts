import { AssistantCommandService } from './assistant-command.service';
import type { AiRouterService } from '../ai-router.service';
import type { AssistantCommandDto } from '../dto/assistant-command.dto';

/**
 * ทดสอบเส้นทาง rule-based (mock AI ให้ throw → interpret ใช้ fallback)
 * เน้น: จับงานจากคำใกล้เคียง + did-you-mean + ความปลอดภัย (ไม่บันทึก)
 */
describe('AssistantCommandService', () => {
  const ai = {
    chat: jest.fn().mockRejectedValue(new Error('no provider in test')),
  } as unknown as AiRouterService;
  const service = new AssistantCommandService(ai);

  const dto = (message: string, extra: Partial<AssistantCommandDto> = {}): AssistantCommandDto =>
    ({ message, sc_id: 1, budget_year: '2569', ...extra }) as AssistantCommandDto;

  it('จับงานจากคำใกล้เคียง: "ค่าเดินทางไปราชการ" → travel_reimbursement', async () => {
    const r = await service.interpret(dto('ขอเบิกค่าเดินทางไปราชการให้ครูสมชาย'));
    expect(r.task_key).toBe('travel_reimbursement');
    expect(r.safety.can_save).toBe(false);
  });

  it('did-you-mean: คำสะกดผิดที่ไม่ผูกกับงาน → clarify พร้อม suggested_terms', async () => {
    const r = await service.interpret(dto('เงินอุดหนนุนรายหัว'));
    expect(r.phase).toBe('clarify');
    expect(r.task_key).toBeNull();
    expect(r.suggested_terms.map((s) => s.canonical)).toContain('เงินอุดหนุนค่าใช้จ่ายรายหัว');
    expect(r.message).toContain('คุณหมายถึง');
  });

  it('คำสั่งชัดเจน "เพิ่มโครงการ" → เลือกงาน create_project', async () => {
    const r = await service.interpret(dto('อยากเพิ่มโครงการอบรมครู'));
    expect(r.task_key).toBe('create_project');
  });

  it('งานต่อเนื่อง: ส่ง task_key มา → ยึดงานเดิม', async () => {
    const r = await service.interpret(dto('20000 บาท', { task_key: 'create_project' }));
    expect(r.task_key).toBe('create_project');
  });

  it('ความปลอดภัย: ทุกผลลัพธ์ห้ามบันทึกและต้องให้ผู้ใช้ตรวจสอบเอง', async () => {
    const r = await service.interpret(dto('เพิ่มโครงการอบรมครู วงเงิน 20000 บาท'));
    expect(r.safety).toEqual({ can_save: false, requires_user_review: true });
  });
});
