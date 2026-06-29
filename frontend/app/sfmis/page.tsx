import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Landmark,
  Lightbulb,
  PackageCheck,
  ReceiptText,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ภาพรวมระบบและคู่มือการทำงาน | SFMIS',
  description: 'ความหมาย ขั้นตอนการทำงาน และเอกสารอ้างอิงของงานนโยบายและแผน งานพัสดุ และงานการเงิน',
};

const DEPARTMENTS = [
  {
    id: 'plan',
    eyebrow: '01 / PLAN',
    title: 'งานนโยบายและแผน',
    description: 'แปลงนโยบายและข้อมูลของโรงเรียนให้เป็นแผนปฏิบัติการ โครงการ และกรอบงบประมาณที่ตรวจสอบและติดตามผลได้',
    icon: ClipboardList,
    accentClass: 'bg-sky-600 text-white',
    softClass: 'bg-sky-50 text-sky-700 ring-sky-100',
    borderClass: 'border-sky-200',
    buttonClass: 'bg-sky-600 hover:bg-sky-700',
    startHref: '/sfmis/student',
    startLabel: 'เริ่มงานนโยบายและแผน',
    outcomes: ['แผนปฏิบัติการประจำปี', 'โครงการที่ผ่านการอนุมัติ', 'กรอบวงเงินสำหรับจัดซื้อจัดจ้าง'],
    steps: [
      {
        label: 'เตรียมข้อมูลพื้นฐาน',
        detail: 'ยืนยันจำนวนนักเรียน เงินเหลือจ่าย และข้อมูลปีงบประมาณ',
        href: '/sfmis/student',
      },
      {
        label: 'คำนวณและกำหนดกรอบงบ',
        detail: 'คำนวณเงินรายหัว สรุปงบ และจัดสรรวงเงินตามหมวด',
        href: '/sfmis/calculate-perhead',
      },
      {
        label: 'จัดทำแผนงาน/โครงการ',
        detail: 'ระบุเป้าหมาย กิจกรรม ตัวชี้วัด ระยะเวลา และงบประมาณ',
        href: '/sfmis/plan-menu/project',
      },
      {
        label: 'พิจารณาและอนุมัติ',
        detail: 'ตรวจความสอดคล้องของแผน งบประมาณ และความพร้อมดำเนินงาน',
        href: '/sfmis/plan-menu/proj-approve',
      },
      {
        label: 'ส่งต่อแผนจัดซื้อ',
        detail: 'ส่งรายการที่อนุมัติแล้วเข้าสู่งานจัดซื้อจัดจ้าง',
        href: '/sfmis/plan-menu/procurement-plan',
      },
    ],
  },
  {
    id: 'supply',
    eyebrow: '02 / SUPPLY',
    title: 'งานพัสดุ',
    description:
      'ดำเนินการจัดซื้อจัดจ้าง รับและควบคุมพัสดุให้คุ้มค่า โปร่งใส มีหลักฐาน และเป็นไปตามวงเงินที่ได้รับอนุมัติ',
    icon: PackageCheck,
    accentClass: 'bg-emerald-600 text-white',
    softClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    borderClass: 'border-emerald-200',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    startHref: '/sfmis/setting-committee',
    startLabel: 'เริ่มงานพัสดุ',
    outcomes: ['เอกสารจัดซื้อจัดจ้างครบถ้วน', 'ผลตรวจรับและหลักฐานส่งมอบ', 'ทะเบียนวัสดุ/ครุภัณฑ์ที่เป็นปัจจุบัน'],
    steps: [
      {
        label: 'รับแผนและตรวจวงเงิน',
        detail: 'ตรวจโครงการ รายการ งบประมาณ และวิธีการจัดหาที่เหมาะสม',
        href: '/sfmis/plan-menu/procurement-plan',
      },
      {
        label: 'แต่งตั้งผู้รับผิดชอบ',
        detail: 'กำหนดคณะกรรมการหรือผู้ตรวจรับตามเงื่อนไขและวงเงิน',
        href: '/sfmis/setting-committee',
      },
      {
        label: 'จัดทำคำขอและเอกสาร',
        detail: 'จัดทำรายละเอียดพัสดุ ราคากลาง และเอกสารจัดซื้อจัดจ้าง',
        href: '/sfmis/supplie-setting/withdraw-confirm',
      },
      {
        label: 'สั่งซื้อ/ทำสัญญา',
        detail: 'บันทึกคู่ค้า เงื่อนไขสัญญา กำหนดส่งมอบ และหลักประกัน',
        href: '/sfmis/supplie-setting/contract',
      },
      {
        label: 'รับและตรวจรับพัสดุ',
        detail: 'ตรวจจำนวน คุณภาพ วันส่งมอบ และแนบหลักฐานการตรวจรับ',
        href: '/sfmis/receive-parcel',
      },
      {
        label: 'ขึ้นทะเบียนและส่งเบิก',
        detail: 'บันทึกวัสดุ/ครุภัณฑ์ แล้วส่งชุดเอกสารให้งานการเงิน',
        href: '/sfmis/supplies',
      },
    ],
  },
  {
    id: 'finance',
    eyebrow: '03 / FINANCE',
    title: 'งานการเงิน',
    description: 'ควบคุมการรับ จ่าย เก็บรักษา และรายงานเงินของโรงเรียนให้ถูกต้อง ครบถ้วน ทันเวลา และตรวจสอบย้อนกลับได้',
    icon: ReceiptText,
    accentClass: 'bg-amber-500 text-white',
    softClass: 'bg-amber-50 text-amber-800 ring-amber-100',
    borderClass: 'border-amber-200',
    buttonClass: 'bg-amber-500 hover:bg-amber-600',
    startHref: '/sfmis/financial-report/receipt-book',
    startLabel: 'เริ่มงานการเงิน',
    outcomes: ['ใบเสร็จและหลักฐานจ่ายที่ตรวจสอบได้', 'ทะเบียนคุมและยอดเงินถูกต้อง', 'รายงานประจำวัน เดือน และปี'],
    steps: [
      {
        label: 'ตั้งค่าต้นปี',
        detail: 'กำหนดเล่มใบเสร็จ เลขที่เอกสาร บัญชีธนาคาร และยอดยกมา',
        href: '/sfmis/financial-report/receipt-book',
      },
      {
        label: 'รับเงินและออกใบเสร็จ',
        detail: 'บันทึกแหล่งเงิน ออกใบเสร็จ และนำฝากตามกำหนด',
        href: '/sfmis/receive-menu/receive',
      },
      {
        label: 'รับชุดเอกสารขอจ่าย',
        detail: 'รับเรื่องหลังตรวจรับ ตรวจผู้ขาย จำนวนเงิน ภาษี และแหล่งงบ',
        href: '/sfmis/pay-menu/invoice',
      },
      {
        label: 'ตรวจสอบและอนุมัติจ่าย',
        detail: 'ตรวจใบสำคัญ หลักฐาน อำนาจอนุมัติ และยอดคงเหลือ',
        href: '/sfmis/confirm-invoice',
      },
      {
        label: 'จ่ายเงินและออกหลักฐาน',
        detail: 'ออกเช็ค/โอนเงิน บันทึกภาษีหัก ณ ที่จ่าย และผู้รับเงิน',
        href: '/sfmis/pay-menu/generate-check',
      },
      {
        label: 'ปิดยอดและรายงาน',
        detail: 'ตรวจเงินสด ธนาคาร ทะเบียนคุม และรายงานเงินคงเหลือประจำวัน',
        href: '/sfmis/financial-report/daily-balance',
      },
    ],
  },
] as const;

const HANDOFF_STEPS = [
  { label: 'กำหนดทิศทาง', owner: 'นโยบายและแผน', detail: 'นโยบาย ข้อมูลพื้นฐาน และเป้าหมายโรงเรียน' },
  { label: 'อนุมัติโครงการ', owner: 'ผู้บริหาร', detail: 'รับรองกิจกรรม วงเงิน และระยะเวลาดำเนินงาน' },
  { label: 'ดำเนินการจัดหา', owner: 'งานพัสดุ', detail: 'จัดซื้อจัดจ้างตามวิธีและวงเงินที่กำหนด' },
  { label: 'ตรวจรับ', owner: 'คณะกรรมการ', detail: 'ยืนยันว่าได้รับพัสดุ/งานถูกต้องตามเงื่อนไข' },
  { label: 'เบิกจ่าย', owner: 'งานการเงิน', detail: 'ตรวจเอกสาร อนุมัติจ่าย และบันทึกรายการ' },
  { label: 'รายงานและติดตาม', owner: 'ทุกฝ่าย', detail: 'เทียบแผน ผลงาน งบประมาณ และหลักฐาน' },
] as const;

const REFERENCE_GROUPS = [
  {
    title: 'นโยบาย แผน และงบประมาณ',
    icon: ClipboardList,
    tone: 'text-sky-700 bg-sky-50',
    items: [
      {
        title: 'พระราชบัญญัติวิธีการงบประมาณ พ.ศ. 2561',
        source: 'สำนักงานคณะกรรมการกฤษฎีกา',
        href: 'https://www.ocs.go.th/searchlaw-law',
      },
      {
        title: 'พระราชบัญญัติวินัยการเงินการคลังของรัฐ พ.ศ. 2561',
        source: 'สำนักงานคณะกรรมการกฤษฎีกา',
        href: 'https://www.ocs.go.th/searchlaw-law',
      },
      {
        title: 'ระเบียบว่าด้วยการบริหารงบประมาณ พ.ศ. 2562 และที่แก้ไขเพิ่มเติม',
        source: 'สำนักงบประมาณ',
        href: 'https://www.bb.go.th/',
      },
      {
        title: 'แนวทางและนโยบายการจัดการศึกษาขั้นพื้นฐานประจำปี',
        source: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
        href: 'https://www.obec.go.th/',
      },
    ],
  },
  {
    title: 'จัดซื้อจัดจ้างและบริหารพัสดุ',
    icon: Scale,
    tone: 'text-emerald-700 bg-emerald-50',
    items: [
      {
        title: 'พระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560',
        source: 'สำนักงานคณะกรรมการกฤษฎีกา',
        href: 'https://www.ocs.go.th/searchlaw-law',
      },
      {
        title: 'ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ พ.ศ. 2560',
        source: 'กรมบัญชีกลาง',
        href: 'https://www.cgd.go.th/',
      },
      {
        title: 'กฎกระทรวงและหนังสือเวียนเกี่ยวกับวงเงิน วิธีจัดหา และคณะกรรมการ',
        source: 'กรมบัญชีกลาง',
        href: 'https://www.cgd.go.th/',
      },
      {
        title: 'ระบบและประกาศจัดซื้อจัดจ้างภาครัฐ (e-GP)',
        source: 'กรมบัญชีกลาง',
        href: 'https://www.gprocurement.go.th/new_index.html',
      },
    ],
  },
  {
    title: 'การเงิน บัญชี และภาษี',
    icon: Landmark,
    tone: 'text-amber-800 bg-amber-50',
    items: [
      {
        title:
          'ระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลัง การรับเงิน การจ่ายเงิน การเก็บรักษาเงิน และการนำเงินส่งคลัง พ.ศ. 2562',
        source: 'กรมบัญชีกลาง',
        href: 'https://www.cgd.go.th/',
      },
      {
        title: 'คู่มือระบบควบคุมการเงินของหน่วยงานย่อย พ.ศ. 2544',
        source: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
        href: 'https://www.obec.go.th/',
      },
      {
        title: 'หลักเกณฑ์และหนังสือเวียนด้านการเบิกจ่าย การรับเงิน และเงินยืม',
        source: 'กรมบัญชีกลาง',
        href: 'https://www.cgd.go.th/',
      },
      { title: 'ประมวลรัษฎากรและแนวทางภาษีหัก ณ ที่จ่าย', source: 'กรมสรรพากร', href: 'https://www.rd.go.th/' },
    ],
  },
] as const;

export default function SfmisLandingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative grid items-end gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-sky-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              คู่มือการทำงาน SFMIS ฉบับย่อ
            </div>
            <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              จากนโยบาย สู่แผน
              <span className="block text-sky-300">จากการจัดหา สู่การเงินที่ตรวจสอบได้</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              ภาพรวมความหมาย ขั้นตอน และจุดส่งต่องานระหว่างงานนโยบายและแผน งานพัสดุ และงานการเงิน
              เพื่อให้ทุกฝ่ายใช้ข้อมูลชุดเดียวกันและเห็นปลายทางของงานตั้งแต่เริ่มต้น
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                เข้าสู่ระบบ
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#departments"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-sky-50"
              >
                ดูขั้นตอนแต่ละฝ่าย
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#references"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <BookOpenCheck className="h-4 w-4" />
                เอกสารอ้างอิง
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {DEPARTMENTS.map(department => {
              const Icon = department.icon;
              return (
                <Link
                  key={department.id}
                  href={`#${department.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur transition hover:border-white/25 hover:bg-white/[0.12]"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${department.accentClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">{department.eyebrow}</p>
                    <p className="truncate text-sm font-semibold text-white">{department.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700">
              <Route className="h-4 w-4" />
              เส้นทางเดียวกันทั้งระบบ
            </div>
            <h2 className="text-2xl font-bold text-slate-950">งานหนึ่งเรื่อง ส่งต่อกันอย่างไร</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            ทุกขั้นต้องมีผู้รับผิดชอบ สถานะ และหลักฐานชัดเจน งานการเงินเริ่มจ่ายเมื่อการอนุมัติและการตรวจรับครบถ้วนแล้ว
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {HANDOFF_STEPS.map((step, index) => (
            <div key={step.label} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
              {index < HANDOFF_STEPS.length - 1 && (
                <span className="absolute -right-5 top-7 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 xl:flex">
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
              <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm font-bold text-slate-900">{step.label}</p>
              <p className="mt-1 text-xs font-medium text-indigo-700">{step.owner}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="departments" className="scroll-mt-6 space-y-5">
        <div className="px-1">
          <p className="text-sm font-semibold text-indigo-700">ความหมายและขั้นตอนการทำงาน</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">เลือกฝ่าย แล้วเริ่มจากจุดที่คุณรับผิดชอบ</h2>
        </div>

        {DEPARTMENTS.map(department => {
          const Icon = department.icon;
          return (
            <article
              id={department.id}
              key={department.id}
              className={`scroll-mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm ${department.borderClass}`}
            >
              <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                <div className="border-b border-slate-200 bg-slate-50/70 p-6 lg:border-b-0 lg:border-r sm:p-8">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${department.accentClass}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 text-xs font-bold tracking-[0.18em] text-slate-400">{department.eyebrow}</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-950">{department.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{department.description}</p>

                  <div className={`mt-6 rounded-xl p-4 ring-1 ${department.softClass}`}>
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <CircleCheckBig className="h-4 w-4" />
                      ผลลัพธ์สำคัญ
                    </p>
                    <ul className="space-y-2">
                      {department.outcomes.map(outcome => (
                        <li key={outcome} className="flex gap-2 text-xs leading-5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={department.startHref}
                    className={`mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${department.buttonClass}`}
                  >
                    {department.startLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow</p>
                      <h4 className="text-lg font-bold text-slate-900">ขั้นตอนปฏิบัติงาน</h4>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {department.steps.length} ขั้นตอน
                    </span>
                  </div>
                  <div className="space-y-2">
                    {department.steps.map((step, index) => (
                      <Link
                        key={step.label}
                        href={step.href}
                        className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-xl border border-transparent p-2.5 transition hover:border-slate-200 hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ring-1 ${department.softClass}`}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{step.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{step.detail}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section id="references" className="scroll-mt-6 rounded-2xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-indigo-300">ระเบียบ กฎหมาย และคู่มือ</p>
            <h2 className="mt-1 text-2xl font-bold">เอกสารอ้างอิงสำหรับการปฏิบัติงาน</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              รายการนี้เป็นจุดเริ่มต้นสำหรับตรวจหลักเกณฑ์ของแต่ละงาน ลิงก์จะเปิดเว็บไซต์ของหน่วยงานเจ้าของเรื่อง
              เพื่อค้นหาฉบับเต็มและฉบับแก้ไขเพิ่มเติม
            </p>
            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <Lightbulb className="h-4 w-4" />
                ก่อนปฏิบัติงานจริง
              </p>
              <p className="mt-2 text-xs leading-6 text-amber-100/80">
                ตรวจปีที่ประกาศใช้ ฉบับแก้ไขเพิ่มเติม หนังสือเวียนล่าสุด และคำสั่งมอบอำนาจของต้นสังกัดทุกครั้ง
                โดยเฉพาะวงเงิน วิธีจัดหา และอัตราการเบิกจ่าย
              </p>
            </div>
            <a
              href="https://ratchakitcha.soc.go.th/"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
            >
              ค้นฉบับประกาศในราชกิจจานุเบกษา
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="space-y-4">
            {REFERENCE_GROUPS.map(group => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="rounded-xl bg-white p-4 text-slate-900 sm:p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${group.tone}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="text-sm font-bold sm:text-base">{group.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.items.map(item => (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 py-3 first:pt-1 last:pb-0"
                      >
                        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-5 text-slate-800 group-hover:text-indigo-700">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">แหล่งข้อมูล: {item.source}</span>
                        </span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/sfmis/my-tasks"
          className="group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Users className="h-5 w-5 text-indigo-600" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">ดูงานที่ฉันรับผิดชอบ</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">ติดตามงานที่รอดำเนินการและจุดส่งต่อระหว่างฝ่าย</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
            เปิดงานของฉัน <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/sfmis/plan-menu/projects"
          className="group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">ติดตามสถานะโครงการ</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">เห็นภาพรวมแผน การอนุมัติ การจัดหา และความก้าวหน้า</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            เปิดพื้นที่โครงการ <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/sfmis/financial-report/unified-register"
          className="group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Landmark className="h-5 w-5 text-amber-600" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">ตรวจทะเบียนคุมและรายงาน</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">ตรวจความครบถ้วนของรายการรับ จ่าย และยอดคงเหลือ</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            เปิดทะเบียนคุม <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
