# Security Vulnerabilities Report & Fix Guide

รายงาน Security Vulnerabilities และคู่มือการแก้ไขสำหรับ SFMIS System

**วันที่อัปเดต**: 2024
**Angular Version**: 16.2.12
**Total Vulnerabilities**: 38 (7 low, 18 moderate, 10 high, 3 critical)

## ⚠️ สรุป Vulnerabilities หลัก

### Critical (3)
1. **crypto-js** <4.2.0 - PBKDF2 weakness
2. **form-data** <2.5.4 - Unsafe random function
3. **xml2js** <0.5.0 - Prototype pollution

### High (10)
1. **@angular/common** <19.2.16 - XSRF Token Leakage
2. **@angular/compiler** <=18.2.14 - Stored XSS
3. **dompurify** <=3.2.3 - Multiple XSS vulnerabilities
4. **webpack-dev-middleware** 6.0.0-6.1.1 - Path traversal
5. **ws** 7.0.0-7.5.9 - DoS vulnerability
6. และอื่นๆ

### Moderate (18)
- Angular core, webpack, postcss, quill, sweetalert2, และอื่นๆ

## 🔍 การวิเคราะห์

### 1. crypto-js (Critical)
- **Version ปัจจุบัน**: 3.3.0
- **Version แก้ไข**: 4.2.0
- **การใช้งาน**: ใช้ใน `src/app/mock-api/common/auth/api.ts` สำหรับ JWT token generation (mock API เท่านั้น)
- **ความเสี่ยง**: Critical - PBKDF2 1,000 times weaker
- **คำแนะนำ**: 
  - Mock API ไม่ใช่ production code แต่ควรอัปเดตเพื่อความปลอดภัย
  - อัปเดตเป็น 4.2.0 (ต้องตรวจสอบ breaking changes)

### 2. Angular Packages (High)
- **Versions ปัจจุบัน**: 16.2.12
- **Versions แก้ไข**: 19.2.16+ หรือ 21.0.2
- **ความเสี่ยง**: XSRF Token Leakage, Stored XSS
- **คำแนะนำ**: 
  - ⚠️ **ไม่ควรใช้ `npm audit fix --force`** เพราะจะอัปเดตเป็น Angular 21 ซึ่งเป็น breaking change
  - ควรอัปเดตแบบค่อยเป็นค่อยไป (16 → 17 → 18 → 19)

### 3. quill (Moderate)
- **Version ปัจจุบัน**: 1.3.7
- **Version แก้ไข**: 2.0.3
- **ความเสี่ยง**: Cross-site Scripting
- **คำแนะนำ**: อัปเดตเป็น 2.0.3 (ต้องตรวจสอบ breaking changes)

### 4. sweetalert2 (Moderate)
- **Version ปัจจุบัน**: ^10.16.7
- **Version แก้ไข**: 11.0.0+
- **ความเสี่ยง**: Hidden functionality
- **คำแนะนำ**: อัปเดตเป็น 11.0.0+ (อาจมี breaking changes)

### 5. webpack & webpack-dev-server (Moderate/High)
- **ความเสี่ยง**: XSS, Path traversal, Source code theft
- **คำแนะนำ**: อัปเดตผ่าน @angular-devkit/build-angular

## 🛠️ แผนการแก้ไข (แนะนำ)

### Phase 1: แก้ไข Critical Vulnerabilities (ปลอดภัย)

#### 1.1 อัปเดต crypto-js
```bash
npm install crypto-js@4.2.0
npm install --save-dev @types/crypto-js@latest
```

**ตรวจสอบ breaking changes:**
- ดูที่ `src/app/mock-api/common/auth/api.ts`
- Mock API อาจไม่ได้รับผลกระทบมาก

#### 1.2 อัปเดต sweetalert2 (ถ้าไม่มี breaking changes)
```bash
npm install sweetalert2@latest
```

**ตรวจสอบ:**
- ดูการใช้งานใน `src/@fuse/services/connect.api.service.ts`
- ทดสอบ UI dialogs

### Phase 2: แก้ไข Moderate Vulnerabilities (ระวัง)

#### 2.1 อัปเดต quill
```bash
npm install quill@latest
npm install ngx-quill@latest
```

**⚠️ ระวัง**: quill 2.x อาจมี breaking changes

#### 2.2 อัปเดต dependencies อื่นๆ ที่ไม่ใช่ breaking
```bash
npm audit fix
```

**หมายเหตุ**: คำสั่งนี้จะแก้ไขเฉพาะ vulnerabilities ที่ไม่ใช่ breaking changes

### Phase 3: อัปเดต Angular (ต้องระวังมาก)

#### 3.1 ตรวจสอบ Angular Update Guide
- ดูที่ `docs/angular16_update_guide.md` (ถ้ามี)
- ตรวจสอบ Angular Update Guide: https://update.angular.io/

#### 3.2 อัปเดตแบบค่อยเป็นค่อยไป
```bash
# ตรวจสอบก่อน
ng update

# อัปเดตทีละ major version
ng update @angular/core@17 @angular/cli@17
ng update @angular/core@18 @angular/cli@18
ng update @angular/core@19 @angular/cli@19
```

**⚠️ หมายเหตุ**: 
- ต้องทดสอบทุกขั้นตอน
- อาจต้องแก้ไข code หลายจุด
- ควรทำใน branch แยก

## ❌ สิ่งที่ไม่ควรทำ

### 1. อย่าใช้ `npm audit fix --force`
```bash
# ❌ อย่าทำ
npm audit fix --force
```

**เหตุผล:**
- จะอัปเดต Angular เป็น 21.x (breaking change ใหญ่)
- จะอัปเดต dependencies อื่นๆ เป็น breaking versions
- อาจทำให้ระบบไม่ทำงาน

### 2. อย่าอัปเดตทุกอย่างพร้อมกัน
- ควรอัปเดตทีละ package
- ทดสอบทุกครั้งหลังอัปเดต

## ✅ แนวทางที่แนะนำ

### สำหรับ Production (ปัจจุบัน)
1. **ใช้ `npm audit fix`** (ไม่ใช่ --force) เพื่อแก้ไข vulnerabilities ที่ไม่ใช่ breaking
2. **อัปเดต crypto-js** เป็น 4.2.0 (critical)
3. **อัปเดต sweetalert2** เป็น latest (ถ้าไม่มี breaking)
4. **ติดตาม vulnerabilities** อย่างสม่ำเสมอ

### สำหรับ Development (ระยะยาว)
1. **วางแผนอัปเดต Angular** จาก 16 → 17 → 18 → 19
2. **ทดสอบใน development environment** ก่อน
3. **อัปเดต dependencies อื่นๆ** ตามลำดับความสำคัญ
4. **เขียน tests** เพื่อให้มั่นใจว่าไม่มี regression

## 📋 Checklist การแก้ไข

### Critical
- [ ] อัปเดต crypto-js เป็น 4.2.0
- [ ] ทดสอบ mock API หลังอัปเดต
- [ ] อัปเดต form-data (ถ้าใช้)
- [ ] อัปเดต xml2js (ถ้าใช้)

### High
- [ ] วางแผนอัปเดต Angular (16 → 17 → 18 → 19)
- [ ] อัปเดต dompurify (ถ้าใช้)
- [ ] อัปเดต webpack-dev-middleware (ผ่าน Angular CLI)

### Moderate
- [ ] อัปเดต sweetalert2
- [ ] อัปเดต quill (ระวัง breaking changes)
- [ ] รัน `npm audit fix` (ไม่ใช่ --force)

## 🔗 Resources

- [Angular Update Guide](https://update.angular.io/)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Security Advisories](https://github.com/advisories)

## 📝 หมายเหตุ

- **Mock API**: crypto-js ใช้ใน mock API เท่านั้น ไม่ใช่ production code แต่ควรอัปเดตเพื่อความปลอดภัย
- **Development Dependencies**: vulnerabilities ใน devDependencies (เช่น protractor, karma) มีความเสี่ยงต่ำกว่า
- **Breaking Changes**: ควรอ่าน changelog ของแต่ละ package ก่อนอัปเดต

---

**คำแนะนำสุดท้าย**: 
- สำหรับ production: ใช้ `npm audit fix` (ไม่ใช่ --force) และอัปเดต critical vulnerabilities
- สำหรับ development: วางแผนอัปเดต Angular แบบค่อยเป็นค่อยไป

