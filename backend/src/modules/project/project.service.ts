import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectPolicy } from './entities/project-policy.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { type JwtUser } from '../../common/utils/tenant-guard';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { MasterScPolicy } from '../settings/entities/master-sc-policy.entity';
import { Admin } from '../admin/entities/admin.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPolicy)
    private readonly projectPolicyRepository: Repository<ProjectPolicy>,
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepository: Repository<ParcelOrder>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(MasterScPolicy)
    private readonly scPolicyRepository: Repository<MasterScPolicy>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  /**
   * resolve ผู้รับผิดชอบ (admin) ให้ผูกกับโรงเรียน — คืนชื่อ snapshot
   * @throws ForbiddenException ถ้า owner ไม่ใช่ผู้ใช้ของโรงเรียนนั้น
   */
  private async resolveOwner(
    ownerAdminId: number | null | undefined,
    scId: number | null | undefined,
  ): Promise<string | null> {
    if (!ownerAdminId) return null;
    const admin = await this.adminRepository.findOne({
      where: { adminId: ownerAdminId, del: 0 },
      select: ['adminId', 'name', 'scId'],
    });
    if (!admin) throw new ForbiddenException('ไม่พบผู้รับผิดชอบที่เลือก');
    if (scId != null && admin.scId !== scId) {
      throw new ForbiddenException(
        'ผู้รับผิดชอบต้องเป็นผู้ใช้ในโรงเรียนเดียวกัน',
      );
    }
    return admin.name ?? null;
  }

  /**
   * แทนที่ชุดนโยบายของโครงการ (soft-delete เดิม + ใส่ใหม่) จาก scp_id
   * ตรวจว่านโยบายเป็นของโรงเรียนนั้นจริง คืนรายชื่อที่บันทึก (ไว้ sync proj_policy)
   */
  private async replacePolicies(
    projectId: number,
    scId: number,
    policyIds: number[] | undefined,
    upBy: number | null,
  ): Promise<string[]> {
    if (policyIds === undefined) {
      // ไม่ส่งมา = ไม่แตะของเดิม
      const existing = await this.projectPolicyRepository.find({
        where: { projectId, del: 0 },
      });
      return existing.map((p) => p.policyName ?? '').filter(Boolean);
    }

    // soft-delete ของเดิมทั้งหมด
    void upBy;
    await this.projectPolicyRepository.update({ projectId, del: 0 }, { del: 1 });

    const uniqIds = [...new Set(policyIds.filter((x) => !!x))];
    if (uniqIds.length === 0) return [];

    // ดึงเฉพาะนโยบายของโรงเรียนนี้ (กัน cross-tenant)
    const policies = await this.scPolicyRepository.find({
      where: { scpId: In(uniqIds), scId, del: 0 },
    });
    const names: string[] = [];
    for (const p of policies) {
      const row = this.projectPolicyRepository.create({
        projectId,
        scpId: p.scpId,
        policyName: p.scPolicy,
        scId,
        del: 0,
      });
      await this.projectPolicyRepository.save(row);
      names.push(p.scPolicy);
    }
    return names;
  }

  /** โหลดนโยบายของหลายโครงการ (group by project_id) */
  private async loadPoliciesMap(
    projectIds: number[],
  ): Promise<Map<number, { scp_id: number; sp_name: string }[]>> {
    const map = new Map<number, { scp_id: number; sp_name: string }[]>();
    if (projectIds.length === 0) return map;
    const rows = await this.projectPolicyRepository.find({
      where: { projectId: In(projectIds), del: 0 },
      order: { ppId: 'ASC' },
    });
    for (const r of rows) {
      const arr = map.get(r.projectId) ?? [];
      arr.push({ scp_id: r.scpId, sp_name: r.policyName ?? '' });
      map.set(r.projectId, arr);
    }
    return map;
  }

  async loadProject(
    scId: number,
    userId: number,
    page: number,
    pageSize: number,
    syId: number,
  ) {
    const [items, count] = await this.projectRepository.findAndCount({
      where: { scId, syId, del: 0 },
      order: { projId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    // นโยบายหลายข้อ (ตารางเชื่อม) ของทุกโครงการในหน้านี้
    const policiesMap = await this.loadPoliciesMap(items.map((i) => i.projId));

    // ข้อมูลปีการศึกษา/ภาคเรียน/ปีงบ จาก school_year ของ sy_id (ทุกแถวใช้ syId เดียวกัน)
    const sy =
      syId > 0
        ? await this.schoolYearRepository.findOne({ where: { syId } })
        : null;

    // Map entity fields to frontend expected format
    const formattedData = items.map((item) => {
      const policies = policiesMap.get(item.projId) ?? [];
      return {
        project_id: item.projId,
        project_code: `PROJ-${item.projId.toString().padStart(6, '0')}`, // Generate project code
        project_name: item.projName,
        budget: Number(item.projBudget),
        status: item.projStatus,
        update_date: item.updateDate
          ? item.updateDate.toISOString().split('T')[0]
          : null,
        cre_by: item.upBy || userId, // Use upBy as cre_by, fallback to userId
        proj_id: item.projId,
        proj_name: item.projName,
        proj_detail: item.projDetail,
        proj_policy: item.projPolicy,
        policies, // [{ scp_id, sp_name }]
        policy_ids: policies.map((p) => p.scp_id),
        proj_budget_type: item.projBudgetType,
        proj_owner: item.projOwner,
        owner_admin_id: item.ownerAdminId,
        proj_budget: Number(item.projBudget),
        proj_status: item.projStatus,
        pbc_id: item.pbcId,
        sc_id: item.scId,
        sy_id: item.syId,
        budget_year: item.budgetYear,
        sy_year: sy?.syYear ?? null,
        semester: sy?.semester ?? null,
        up_by: item.upBy,
        create_date: item.createDate
          ? item.createDate.toISOString().split('T')[0]
          : null,
        del: item.del,
      };
    });

    return {
      data: formattedData,
      count,
      page,
      pageSize,
    };
  }

  async addProject(payload: CreateProjectDto) {
    // ป้องกัน duplicate ชื่อโครงการในปีเดียวกัน (Low priority)
    if (payload.proj_name && payload.sc_id && payload.sy_id) {
      const exists = await this.projectRepository.findOne({
        where: {
          projName: payload.proj_name,
          scId: payload.sc_id,
          syId: payload.sy_id,
          del: 0,
        },
      });
      if (exists) {
        return { flag: false, ms: 'ชื่อโครงการนี้มีอยู่แล้วในปีการศึกษานี้' };
      }
    }

    // ผู้รับผิดชอบ: เลือกจากผู้ใช้ในโรงเรียน (ผูก sc_id) — คืนชื่อ snapshot
    const ownerName = await this.resolveOwner(
      payload.owner_admin_id,
      payload.sc_id,
    );

    const project = new Project();
    project.projName = payload.proj_name;
    project.projDetail = payload.proj_detail || null;
    project.projBudgetType = payload.proj_budget_type || null;
    project.ownerAdminId = payload.owner_admin_id ?? null;
    project.projOwner = ownerName ?? payload.proj_owner ?? null;
    project.projBudget = payload.proj_budget || 0;
    project.pbcId = payload.pbc_id || null;
    project.scId = payload.sc_id || null;
    project.syId = payload.sy_id || null;
    project.budgetYear = payload.budget_year ?? null;
    project.upBy = payload.up_by || null;
    project.projStatus = 0;
    project.del = 0;

    const saved = await this.projectRepository.save(project);

    // นโยบายโรงเรียนหลายข้อ → ตารางเชื่อม pln_project_policy
    const policyNames = await this.replacePolicies(
      saved.projId,
      payload.sc_id ?? 0,
      payload.policy_ids,
      payload.up_by ?? null,
    );
    // sync proj_policy (legacy display) = ชื่อนโยบายที่เลือก
    saved.projPolicy = policyNames.length
      ? policyNames.join(', ')
      : payload.proj_policy || null;
    await this.projectRepository.save(saved);

    // สร้าง parcel_order คู่กัน → ส่งเข้า workflow อนุมัติ (1.3 อนุมัติโครงการ)
    // status=1 (ขอ) เพื่อให้หัวหน้าฝ่ายแผนงานเริ่มตรวจสอบได้
    let acadYear: number | null = null;
    if (payload.sy_id) {
      const sy = await this.schoolYearRepository.findOne({
        where: { syId: payload.sy_id },
      });
      acadYear = sy?.budgetYear ?? sy?.syYear ?? null;
    }
    const order = this.parcelOrderRepository.create({
      projectId: saved.projId,
      scId: payload.sc_id ?? null,
      adminId: payload.up_by ?? null,
      orderDate: new Date(),
      orderStatus: 1,
      acadYear,
      details: payload.proj_name,
      budgets: payload.proj_budget || 0,
      upBy: payload.up_by ?? 0,
      del: 0,
    });
    await this.parcelOrderRepository.save(order);

    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateProject(payload: UpdateProjectDto, user: JwtUser) {
    const project = await this.projectRepository.findOne({
      where: { projId: payload.proj_id, del: 0 },
    });

    if (!project) {
      return { flag: false, ms: 'ไม่พบข้อมูลโครงการ' };
    }

    // ตรวจ tenant: non-super admin แก้ไขได้เฉพาะโครงการของโรงเรียนตัวเอง
    if (user.type !== 1 && project.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถแก้ไขข้อมูลของโรงเรียนอื่นได้');
    }

    if (payload.proj_name !== undefined) project.projName = payload.proj_name;
    if (payload.proj_detail !== undefined)
      project.projDetail = payload.proj_detail;
    if (payload.proj_budget_type !== undefined)
      project.projBudgetType = payload.proj_budget_type;
    if (payload.proj_budget !== undefined)
      project.projBudget = payload.proj_budget;
    if (payload.pbc_id !== undefined) project.pbcId = payload.pbc_id;
    if (payload.sc_id !== undefined) project.scId = payload.sc_id;
    if (payload.sy_id !== undefined) project.syId = payload.sy_id;
    if (payload.budget_year !== undefined)
      project.budgetYear = payload.budget_year;
    if (payload.up_by !== undefined) project.upBy = payload.up_by;
    if (payload.proj_status !== undefined)
      project.projStatus = payload.proj_status;

    // ผู้รับผิดชอบ: เลือกจากผู้ใช้ในโรงเรียน — resolve ชื่อ snapshot
    if (payload.owner_admin_id !== undefined) {
      project.ownerAdminId = payload.owner_admin_id;
      project.projOwner = await this.resolveOwner(
        payload.owner_admin_id,
        project.scId,
      );
    } else if (payload.proj_owner !== undefined) {
      project.projOwner = payload.proj_owner;
    }

    // นโยบายหลายข้อ → แทนที่ชุดในตารางเชื่อม + sync proj_policy
    if (payload.policy_ids !== undefined) {
      const names = await this.replacePolicies(
        project.projId,
        project.scId ?? 0,
        payload.policy_ids,
        payload.up_by ?? null,
      );
      project.projPolicy = names.length ? names.join(', ') : null;
    } else if (payload.proj_policy !== undefined) {
      project.projPolicy = payload.proj_policy;
    }

    project.updateDate = new Date();
    await this.projectRepository.save(project);

    // sync รายละเอียด/วงเงิน ไปยัง parcel_order หลัก (ใบแรก) เฉพาะกรณีมีใบเดียว
    // ถ้าโครงการมีรายการจัดซื้อหลายใบแล้ว → ผู้ใช้จัดการวงเงินรายใบเอง ไม่ sync ทับ
    const orders = await this.parcelOrderRepository.find({
      where: { projectId: project.projId, del: 0 },
      order: { orderId: 'ASC' },
    });
    if (orders.length === 1) {
      const primary = orders[0];
      let changed = false;
      if (payload.proj_name !== undefined) {
        primary.details = payload.proj_name;
        changed = true;
      }
      if (payload.proj_budget !== undefined) {
        primary.budgets = payload.proj_budget;
        changed = true;
      }
      if (changed) {
        primary.updateDate = new Date();
        await this.parcelOrderRepository.save(primary);
      }
    }

    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeProject(projId: number, user: JwtUser) {
    const project = await this.projectRepository.findOne({
      where: { projId, del: 0 },
    });

    if (!project) {
      return { flag: false, ms: 'ไม่พบข้อมูลโครงการ' };
    }

    // ตรวจ tenant: non-super admin ลบได้เฉพาะโครงการของโรงเรียนตัวเอง
    if (user.type !== 1 && project.scId !== user.sc_id) {
      throw new ForbiddenException('ไม่สามารถลบข้อมูลของโรงเรียนอื่นได้');
    }

    project.del = 1;
    project.updateDate = new Date();
    await this.projectRepository.save(project);

    // soft-delete parcel_order ที่ผูกกับโครงการนี้ด้วย (ถ้ายังไม่ถึงขั้นจัดซื้อจริง)
    await this.parcelOrderRepository.update(
      { projectId: projId, del: 0 },
      { del: 1, updateDate: new Date() },
    );

    // soft-delete นโยบายที่ผูกกับโครงการ
    await this.projectPolicyRepository.update(
      { projectId: projId, del: 0 },
      { del: 1 },
    );

    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  loadPLNBudgetCategory(_scId: number, _syId: number, _budgetYear: string) {
    // ในกรณีที่ยังไม่มี entity สำหรับ PLN Budget Category
    return {
      data: [],
      count: 0,
    };
  }

  loadPLNBudgetCategoryRp() {
    // ในกรณีที่ยังไม่มี entity สำหรับ PLN Budget Category
    return {
      data: [],
      count: 0,
    };
  }

  masterSaoPolicy() {
    // ในกรณีที่ยังไม่มี entity สำหรับ Master SAO Policy
    return {
      data: [],
      count: 0,
    };
  }

  masterMoePolicy() {
    // ในกรณีที่ยังไม่มี entity สำหรับ Master MOE Policy
    return {
      data: [],
      count: 0,
    };
  }

  masterObecPolicy() {
    // ในกรณีที่ยังไม่มี entity สำหรับ Master OBEC Policy
    return {
      data: [],
      count: 0,
    };
  }

  masterQuickWin() {
    // ในกรณีที่ยังไม่มี entity สำหรับ Master Quick Win
    return {
      data: [],
      count: 0,
    };
  }

  masterScPolicy(_scId: number) {
    // ในกรณีที่ยังไม่มี entity สำหรับ Master SC Policy
    return {
      data: [],
      count: 0,
    };
  }
}
