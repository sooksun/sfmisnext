ชุด production สำหรับใช้ Claude ทำงานสาย coding แบบเอาไปใช้กับโปรเจกต์จริงได้เลย โดยผมจะจัดให้เป็น 4 ส่วน:
1.	ชุด shortcut ที่ควรใช้ 
2.	ลำดับการใช้จริง 
3.	prompt template พร้อมคัดลอก 
4.	ตัวอย่าง workflow สำหรับ Next.js + NestJS + Prisma 
________________________________________
1) ชุด Claude Shortcuts สำหรับงาน Coding ระดับ Production
A. ชุดเริ่มต้นโปรเจกต์
ใช้ตอน “ยังไม่ควรรีบเขียนโค้ด”
•	/init
ตั้งต้น workspace / ทำความเข้าใจโปรเจกต์ 
•	/system-analyst
วิเคราะห์ requirement ให้เป็นงานย่อย 
•	/architecture-design
ออกแบบภาพรวมระบบ, module, boundary, data flow 
•	/database-designer
ออกแบบ ERD, schema, relation, indexing 
•	/api-contract-guardian
กำหนด API contract, request/response, status code, validation 
________________________________________
B. ชุดลงมือพัฒนา
ใช้ตอนเริ่ม implement จริง
•	/backend-implementer
เขียน backend module, service, controller, dto, auth, validation 
•	/frontend-implementer
เขียน UI, form, state, API integration, loading/error states 
•	/migration-safe
ตรวจ schema change / migration ไม่ให้ฐานข้อมูลพัง 
•	/test-engineer
เขียน unit test, integration test, edge cases 
________________________________________
C. ชุดควบคุมคุณภาพ
ใช้ก่อน merge หรือก่อน deploy
•	/code-reviewer
ตรวจ logic, maintainability, security, anti-pattern 
•	/release-readiness
เช็กว่า production พร้อมไหม เช่น env, logging, backup, migration, health check 
________________________________________
D. ชุดกู้ภัยเวลาไฟไหม้
ใช้ตอนระบบรวนแล้วหน้าตา dev เริ่มเหมือนนอนน้อยมา 3 คืน
•	/debug-deep
วิเคราะห์ root cause แบบลึก 
•	/log-analyzer
อ่าน log แล้วหาสาเหตุ, timeline, failure point 
________________________________________
2) ลำดับใช้งานที่นิ่งสุด
นี่คือลำดับที่ควรใช้ในโปรเจกต์จริง
/init
/system-analyst
/architecture-design
/database-designer
/api-contract-guardian
/backend-implementer
/frontend-implementer
/migration-safe
/test-engineer
/code-reviewer
/release-readiness
ถ้ามี bug:
/log-analyzer
/debug-deep
/backend-implementer หรือ /frontend-implementer
/test-engineer
/code-reviewer
________________________________________
3) วิธีคิดสำคัญ: อย่าใช้ shortcut แบบ “โยนแล้วภาวนา”
ปัญหาคลาสสิกคือคนใช้ Claude เหมือนเครื่องขายน้ำอัดลม: หยอด requirement หนึ่งก้อน แล้วหวังว่าจะได้ production app ออกมาเลย
ผลคือได้โค้ดที่ “เหมือนจะใช่” แต่แตะจริงแล้วทรุดเหมือนโต๊ะประชุมโรงเรียนที่ใช้มา 18 ปี
หลักที่นิ่งสุดคือ:
•	1 prompt = 1 phase 
•	อย่าปน design + coding + debugging ในคำสั่งเดียว 
•	บังคับ output ให้ชัด 
•	บอก tech stack ให้ครบ 
•	บอกข้อห้ามด้วย 
________________________________________
4) Production Prompt Pack
ชุดนี้คัดลอกไปใช้ได้เลย
________________________________________
4.1 /system-analyst
ใช้ตอนเริ่มฟีเจอร์
/system-analyst

วิเคราะห์ requirement นี้ให้เป็นงานพัฒนาเชิงระบบ

Project:
School Management Platform

Feature:
ระบบลงทะเบียนผู้ใช้งานและเข้าสู่ระบบ

Tech stack:
- Frontend: Next.js
- Backend: NestJS
- Database: MySQL + Prisma

สิ่งที่ต้องการ:
1. สรุป business goal
2. user roles ที่เกี่ยวข้อง
3. use cases
4. functional requirements
5. non-functional requirements
6. edge cases
7. dependency กับ module อื่น
8. แยกงานเป็น backend / frontend / database / testing

ตอบแบบ structured และพร้อมส่งต่อให้ dev implement
________________________________________
4.2 /architecture-design
ใช้ตอนจะออกแบบระบบก่อนลงโค้ด
/architecture-design

ออกแบบ architecture สำหรับ feature นี้

Feature:
ระบบหนังสือราชการเข้า-ออก พร้อม AI ช่วยสรุปสาระสำคัญ

Tech stack:
- Next.js
- NestJS
- Prisma + MySQL
- Redis
- MinIO / S3-compatible storage
- Worker queue สำหรับประมวลผล AI

สิ่งที่ต้องการ:
1. high-level architecture
2. module breakdown
3. request flow
4. async job flow
5. database interaction
6. security concerns
7. scalability concerns
8. recommendation สำหรับ production deployment

ตอบให้มี:
- architecture explanation
- module list
- sequence flow
- deployment notes
________________________________________
4.3 /database-designer
ใช้ก่อนเขียน schema จริง
/database-designer

ออกแบบฐานข้อมูลสำหรับระบบนี้

Domain:
ระบบประเมิน VASK-based Competency Assessment System

ต้องการ:
1. ERD เชิงข้อความ
2. table list
3. field definitions
4. PK/FK
5. indexes ที่ควรมี
6. unique constraints
7. soft delete strategy
8. audit fields
9. multi-tenant support
10. แนวทางแปลงเป็น Prisma schema

เงื่อนไข:
- รองรับหลายปีการศึกษา
- รองรับหลายโรงเรียน
- รองรับหลายบทบาทผู้ใช้
- เน้น query report ได้ดี

ตอบแบบ production-ready ไม่ใช่ demo schema
________________________________________
4.4 /api-contract-guardian
ใช้ก่อน backend/frontend ลงมือพร้อมกัน
/api-contract-guardian

ออกแบบ API contract สำหรับ feature นี้

Feature:
Authentication + User Profile

Tech stack:
- NestJS
- Prisma
- JWT auth

ต้องการ:
1. endpoint list
2. method
3. request body
4. response body
5. validation rules
6. auth/permission requirements
7. error codes
8. pagination/filter/sort ถ้ามี
9. example request/response

ขอให้ตอบในรูปแบบที่ frontend และ backend ใช้ร่วมกันได้ทันที
________________________________________
4.5 /backend-implementer
ใช้ตอนให้ Claude เขียน backend จริง
/backend-implementer

เขียน backend module แบบ production-ready

Tech stack:
- NestJS
- Prisma
- MySQL
- class-validator
- JWT
- bcrypt

Feature:
User authentication

ขอบเขต:
- register
- login
- refresh token
- get current profile

สิ่งที่ต้องส่งออก:
1. folder structure
2. module
3. controller
4. service
5. dto
6. guards
7. prisma model ที่เกี่ยวข้อง
8. error handling
9. validation
10. security notes

ข้อกำหนด:
- clean code
- type-safe
- แยก responsibility ชัด
- พร้อมต่อยอด production
- หลีกเลี่ยง mock code ที่ใช้จริงไม่ได้
________________________________________
4.6 /frontend-implementer
ใช้ตอนทำฝั่งหน้าเว็บ
/frontend-implementer

สร้าง frontend สำหรับ feature นี้

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Query

Feature:
Login / Register / Profile page

สิ่งที่ต้องการ:
1. page structure
2. reusable components
3. form validation
4. API integration
5. loading state
6. error state
7. auth state management
8. redirect behavior
9. route protection

ข้อกำหนด:
- production-ready UI logic
- ไม่ hardcode ข้อมูล
- รองรับ empty/error/loading states ครบ
________________________________________
4.7 /migration-safe
ใช้ทุกครั้งที่แก้ schema จริง
/migration-safe

ตรวจสอบ schema change นี้ในมุม production safety

Context:
กำลังเพิ่มตาราง student_assessments และเปลี่ยน relation กับ students

ต้องการ:
1. วิเคราะห์ผลกระทบ
2. migration risk
3. data loss risk
4. backward compatibility
5. rollout plan
6. rollback plan
7. คำแนะนำก่อนรัน migration บน production
8. checklists หลัง deploy

ตอบแบบระมัดระวังเหมือนฐานข้อมูลไม่ใช่ของเล่น
________________________________________
4.8 /test-engineer
ใช้หลัง implement เสร็จ
/test-engineer

ออกแบบและเขียน test plan สำหรับ feature นี้

Feature:
Leave request module

Stack:
- NestJS
- Prisma
- Jest

ต้องการ:
1. test cases
2. unit tests
3. integration tests
4. validation failure cases
5. authorization cases
6. edge cases
7. regression risks

ขอทั้ง test strategy และตัวอย่าง test code
________________________________________
4.9 /code-reviewer
ใช้ก่อน merge
/code-reviewer

review code ชุดนี้ในระดับ production

ให้ตรวจ:
1. correctness
2. maintainability
3. security
4. performance
5. readability
6. anti-pattern
7. missing validation
8. missing error handling
9. coupling/cohesion
10. production risks

ขอผลลัพธ์เป็น:
- critical issues
- medium issues
- minor issues
- suggested refactor
________________________________________
4.10 /release-readiness
ใช้ก่อนขึ้น production
/release-readiness

ประเมินความพร้อมก่อน deploy production

Project:
Next.js + NestJS + Prisma + MySQL

Checklist ที่ต้องตรวจ:
1. env variables
2. migration readiness
3. seed strategy
4. logging
5. monitoring
6. exception handling
7. backup plan
8. auth/security
9. CORS/cookies/session
10. health checks
11. rate limiting
12. file storage
13. queue/retry
14. deployment rollback plan

ตอบเป็น checklist พร้อม severity
________________________________________
4.11 /log-analyzer
ใช้ตอนระบบล้ม
/log-analyzer

วิเคราะห์ log ชุดนี้และหาสาเหตุของปัญหา

ต้องการ:
1. timeline ของเหตุการณ์
2. จุดเริ่ม error
3. root cause ที่เป็นไปได้
4. สิ่งที่เป็น symptom
5. สิ่งที่เป็น cause
6. next debugging steps
7. วิธีป้องกันในอนาคต
________________________________________
4.12 /debug-deep
ใช้ต่อจาก log-analyzer
/debug-deep

ช่วย debug ปัญหานี้แบบลึก

Context:
ระบบ login สำเร็จ แต่ refresh token ใช้งานไม่ได้ใน production

ต้องการ:
1. สมมติฐานที่เป็นไปได้
2. วิธีไล่ตรวจทีละขั้น
3. จุดที่ควรใส่ logging เพิ่ม
4. config ที่อาจผิด
5. code area ที่น่าสงสัย
6. fix plan ที่ปลอดภัย
________________________________________
5) Workflow จริงสำหรับ Next.js + NestJS + Prisma
Phase 1: วิเคราะห์งาน
ใช้:
/system-analyst
/architecture-design
ผลลัพธ์ที่ควรได้:
•	business goal 
•	use cases 
•	module boundaries 
•	data flow 
________________________________________
Phase 2: ออกแบบฐานข้อมูลและ API
ใช้:
/database-designer
/api-contract-guardian
ผลลัพธ์ที่ควรได้:
•	ERD 
•	Prisma schema draft 
•	endpoint spec 
•	request/response examples 
________________________________________
Phase 3: พัฒนา backend
ใช้:
/backend-implementer
/migration-safe
/test-engineer
ผลลัพธ์ที่ควรได้:
•	module จริง 
•	DTO 
•	Prisma models 
•	migration plan 
•	backend tests 
________________________________________
Phase 4: พัฒนา frontend
ใช้:
/frontend-implementer
/test-engineer
ผลลัพธ์ที่ควรได้:
•	pages/components/forms 
•	query hooks 
•	loading/error states 
•	UI validation 
________________________________________
Phase 5: ตรวจคุณภาพ
ใช้:
/code-reviewer
/release-readiness
ผลลัพธ์ที่ควรได้:
•	issue list 
•	refactor list 
•	deployment checklist 
________________________________________
Phase 6: แก้ปัญหา
ใช้:
/log-analyzer
/debug-deep
ผลลัพธ์ที่ควรได้:
•	root cause 
•	fix plan 
•	prevention plan 
________________________________________
6) สูตรใช้งานที่ดีที่สุด
สูตร A: ทำ feature ใหม่
/system-analyst
/database-designer
/api-contract-guardian
/backend-implementer
/frontend-implementer
/test-engineer
/code-reviewer
สูตร B: refactor ของเดิม
/system-analyst
/code-reviewer
/architecture-design
/backend-implementer
/test-engineer
/release-readiness
สูตร C: production bug
/log-analyzer
/debug-deep
/backend-implementer
/test-engineer
/code-reviewer
สูตร D: แก้ schema/database
/database-designer
/migration-safe
/backend-implementer
/test-engineer
/release-readiness
________________________________________
7) ข้อควรระวังที่สำคัญมาก
1.	อย่าเริ่มที่ /backend-implementer ทันที ถ้ายังไม่มี schema และ API contract 
2.	อย่าให้ Claude เขียน “ทั้งระบบ” ใน prompt เดียว 
3.	อย่าลืมบอก stack, version, constraints 
4.	อย่าปล่อยให้มันเดาเรื่อง auth, validation, roles เอง 
5.	อย่ามอง test เป็นของแถม เพราะ production bug ไม่ได้ถามก่อนเข้ามา 
________________________________________
8) ชุดสั้นที่สุดที่ควรจำ
ถ้าจะจำแค่แกนหลักจริง ๆ ให้จำ 8 ตัวนี้:
/system-analyst
/architecture-design
/database-designer
/api-contract-guardian
/backend-implementer
/frontend-implementer
/test-engineer
/code-reviewer
ถ้า production มากขึ้น ให้เพิ่มอีก 4 ตัวนี้:
/migration-safe
/release-readiness
/log-analyzer
/debug-deep
________________________________________
9) ชุดพร้อมใช้แบบย่อมาก
นี่คือเวอร์ชันสั้นสำหรับแปะไว้หน้าโปรเจกต์
## Claude Coding Flow

New feature:
1. /system-analyst
2. /architecture-design
3. /database-designer
4. /api-contract-guardian
5. /backend-implementer
6. /frontend-implementer
7. /test-engineer
8. /code-reviewer

Schema change:
1. /database-designer
2. /migration-safe
3. /backend-implementer
4. /test-engineer

Before production:
1. /code-reviewer
2. /release-readiness

When bug happens:
1. /log-analyzer
2. /debug-deep
3. /test-engineer

