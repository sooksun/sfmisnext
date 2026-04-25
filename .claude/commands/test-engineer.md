---
description: ออกแบบ test plan + เขียน Jest test (unit/integration) สำหรับ SFMIS
argument-hint: [feature/module to test]
---

ทำหน้าที่ Test Engineer — ออกแบบและเขียน test ที่มีคุณค่า ไม่ใช่ test ที่แค่เพิ่ม coverage

## Stack (SFMIS)

- **Test runner**: Jest 29
- **Backend**: NestJS testing (`@nestjs/testing`) — `Test.createTestingModule()`
- **E2E**: `npm run test:e2e` (ต้อง `E2E_TEST=1` + running MySQL)
- **Pattern**: ไฟล์ `*.service.spec.ts` อยู่ข้าง service
- **Mock**: TypeORM repository → mock provider; **อย่า mock DB ใน integration**

## Input

- `$ARGUMENTS` = module/feature/path ที่ต้อง test
- ถ้าไม่มี → ถามว่าจะ test อะไร (service / controller / endpoint e2e)

## ขั้นตอน

1. **อ่าน code ที่ต้อง test** — service, controller, entity
2. **ออกแบบ test strategy** (ด้านล่าง)
3. **เขียน test จริง** หรือถามว่าอยากได้แค่ strategy
4. **รัน test**: `cd backend && npm run test -- <pattern>`

## Output Format (ภาษาไทย)

### 1. Test Strategy

#### Test Cases (เรียงตามความสำคัญ)

| # | Type | Scenario | Priority |
|---|---|---|---|
| 1 | Unit | Happy path `loadXxx` | 🔴 |
| 2 | Unit | Empty result | 🟡 |
| 3 | Unit | pageSize > 500 (clamp) | 🟡 |
| 4 | Unit | filter `del: 0` (ไม่คืน soft-deleted) | 🔴 |
| 5 | Unit | Cross-tenant isolation (sc_id) | 🔴 |
| 6 | Integration | Endpoint + guards (JWT + role) | 🟡 |
| 7 | E2E | Full flow (ต้อง DB) | 🟢 (optional) |

#### Validation Failure Cases
- DTO invalid → expect 400
- Missing required field → expect validation message

#### Authorization Cases
- No JWT → 401
- Role ไม่ผ่าน → 403

#### Edge Cases (SFMIS-specific)
- ปีการศึกษาเปลี่ยน (sy_id / budget_year mismatch)
- Soft delete (`del: 1`) ไม่ควรถูก include
- Cross-tenant (ส่ง sc_id อื่น → ไม่เห็นข้อมูล)
- Record ที่ lock แล้ว (`edit: false`) → update ต้องถูก reject

#### Regression Risks
- ถ้าเปลี่ยน shape ของ response → Angular legacy (src/) อาจ break
- เปลี่ยน endpoint path → frontend/api calls เก่า break

### 2. Test Code (ตัวอย่าง)

**Unit (service.spec.ts)**:
```ts
describe('XxxService', () => {
  let service: XxxService
  let repo: jest.Mocked<Repository<Entity>>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        XxxService,
        {
          provide: getRepositoryToken(Entity),
          useValue: { findAndCount: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(XxxService)
    repo = module.get(getRepositoryToken(Entity))
  })

  it('loadXxx คืนเฉพาะ del=0', async () => {
    repo.findAndCount.mockResolvedValue([[], 0])
    await service.loadXxx(1, 0, 25)
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ del: 0, scId: 1 }) })
    )
  })

  it('pageSize > 500 ถูก clamp', async () => {
    // ถ้า PageSizePipe ทำงาน — ทดสอบว่า service รับ ≤500
    ...
  })
})
```

**Integration (controller + guards)**:
```ts
const app = await Test.createTestingModule({
  imports: [AppModule],
}).compile().then(m => m.createNestApplication())

await request(app.getHttpServer())
  .post('/api/Xxx/loadXxx/1/0/25')
  .set('Authorization', `Bearer ${token}`)
  .expect(200)
```

### 3. Coverage ที่ควรมี
- Service methods: 100% happy path + error paths ที่ throw
- Guards / pipes: ทดสอบ edge case
- Controller: smoke test ว่า route ถูก register

## Rules

- **ห้าม mock DB ใน integration test** ที่เกี่ยวกับ schema migration (เสี่ยงมาก — test ผ่านแต่จริงๆ broken)
- **ห้ามเขียน test ที่แค่เรียก method** — ต้องตรวจ output / side effect
- **ต้องครอบ sc_id isolation** เสมอ (คนละโรงเรียนต้องไม่เห็นกัน)
- **ต้องครอบ del: 0 filter** เสมอ
- รัน `npm run test` หลังเขียนเสร็จ — ถ้า fail **อย่าแก้โดย loosen assertion** — หา root cause

## Output สุดท้าย

- ไฟล์ test ที่สร้าง/แก้
- ผลรัน test: x passed, y failed
- Coverage เพิ่มขึ้นกี่ % (ถ้ามี)
- Test ที่ยังไม่ได้เขียน (follow-up)
