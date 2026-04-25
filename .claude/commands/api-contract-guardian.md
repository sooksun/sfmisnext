---
description: ออกแบบ API contract (endpoint, request/response, validation) ก่อน backend + frontend ลงมือ
argument-hint: [feature description]
---

ทำหน้าที่ API Contract Guardian — กำหนด contract ที่ทั้ง backend (NestJS) และ frontend (Next.js) ใช้ร่วมกันได้ทันที

## Input

- `$ARGUMENTS` = ฟีเจอร์ที่ต้อง design API (ถ้าไม่มีให้ถาม)

## Stack Conventions (SFMIS)

- **API prefix**: `/api/`
- **Method**: POST เป็นหลัก (เลียน Angular legacy); ใส่ `@HttpCode(HttpStatus.OK)` ทุกครั้ง
- **GET mirror**: list endpoint มักมี GET version ด้วย
- **Path params**: ใช้ `/:scId/:syId/:page/:pageSize` (ไม่ใช่ query string)
- **Endpoint naming**: PascalCase/snake_case controller — `Project/`, `Budget_request/`, `B_admin/`
- **Methods**: `loadXxx`, `getXxx`, `saveXxx`/`addXxx`, `updateXxx`, `removeXxx`
- **Response shape**:
  - List: `{ data: T[], count: number, page: number, pageSize: number }`
  - CUD: `{ flag: boolean, ms: string }`
- **Auth**: JWT global guard; `@Public()` = bypass; `@Roles([1,2,3])` = จำกัด role
- **Validation**: `class-validator` + `ValidationPipe` (whitelist=true, transform=true)

## Output Format (ภาษาไทย)

### 1. Endpoint List

| # | Method | Path | Description | Auth | Role |
|---|---|---|---|---|---|
| 1 | POST | `/api/Xxx/loadXxx/:scId/:page/:pageSize` | โหลด list | JWT | 1-8 |
| 2 | POST | `/api/Xxx/addXxx` | เพิ่ม | JWT | 1,2 |
| 3 | POST | `/api/Xxx/updateXxx` | แก้ไข | JWT | 1,2 |
| 4 | POST | `/api/Xxx/removeXxx` | ลบ (soft) | JWT | 1 |

### 2. Request / Response (per endpoint)

**`POST /api/Xxx/loadXxx/:scId/:page/:pageSize`**

Path params:
- `scId: number` (ParseIntPipe)
- `page: number` (start 0)
- `pageSize: number` (capped by PageSizePipe at 500)

Request body: `{}`

Response:
```json
{
  "data": [
    { "xx_id": 1, "sc_id": 1, "name": "...", "cre_date": "2026-04-15T...", "up_by": "admin_local" }
  ],
  "count": 100,
  "page": 0,
  "pageSize": 25
}
```

**`POST /api/Xxx/addXxx`**

Request body (DTO):
```json
{
  "sc_id": 1,
  "name": "...",
  "up_by": 2
}
```

Validation:
- `sc_id`: `@IsInt() @Min(1)`
- `name`: `@IsString() @MaxLength(200)`
- `up_by`: `@IsInt()`

Response:
```json
{ "flag": true, "ms": "บันทึกเรียบร้อยแล้ว" }
```

Error responses:
- `400`: validation fail — ValidationPipe ส่ง message
- `401`: ไม่มี JWT
- `403`: role ไม่ผ่าน
- `500`: DB error — `{ flag: false, ms: "เกิดข้อผิดพลาด" }`

### 3. Validation Rules Summary
- ทุก DTO ใช้ snake_case (ตรงกับ API Angular legacy)
- `class-validator` decorators เท่าที่จำเป็น
- ถ้า field เป็น optional ใส่ `@IsOptional()`

### 4. Auth / Permission
- List: role 1-8 (ทุกคน)
- Write: จำกัด role ตาม business (มักคือ admin, accounting)
- ระบุ role id ให้ชัด

### 5. Error Codes
| Code | เมื่อไหร่ | Response |
|---|---|---|
| 400 | validation fail | `{ statusCode, message: [...] }` |
| 401 | no JWT | `{ statusCode, message: 'Unauthorized' }` |
| 403 | role fail | `{ statusCode, message: 'Forbidden' }` |
| 500 | DB error | `{ flag: false, ms: '...' }` |

### 6. Pagination / Filter / Sort
- Pagination: path param `/:page/:pageSize` (0-indexed page)
- Sort: ใน body หรือ service default (เช่น `ORDER BY xx_id DESC`)
- Filter: ใน request body `{ filter: {...} }`

### 7. Example (ready to copy)

**Frontend (Next.js) call:**
```tsx
const { data } = useQuery({
  queryKey: ['xxx', scId, page, pageSize],
  queryFn: () => apiPost<{ data: Xxx[]; count: number }>(
    `Xxx/loadXxx/${scId}/${page}/${pageSize}`, {}
  ),
})
```

**Backend (NestJS) signature:**
```ts
@Post('loadXxx/:scId/:page/:pageSize')
@HttpCode(HttpStatus.OK)
loadXxx(
  @Param('scId', ParseIntPipe) scId: number,
  @Param('page', ParseIntPipe) page: number,
  @Param('pageSize', ParseIntPipe) pageSize: number,
) {
  return this.service.loadXxx(scId, page, pageSize);
}
```

## Rules

- **ต้อง mirror Angular legacy** ถ้า endpoint มี prefix รูปแบบ Angular ใช้ตาม
- **ห้ามใช้ camelCase ใน body** — snake_case เพื่อให้ Angular + Next.js ใช้ร่วมกันได้
- **ต้องระบุ role** ที่เข้าถึงได้ — ไม่ปล่อยให้ guess
- **ต้องสอดคล้องกับ PageSizePipe** — pageSize ไม่เกิน 500
- **ไม่เขียน implementation** — เฉพาะ contract
