import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { ProjectFollowup } from '../project-followup/entities/project-followup.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { AttachmentService } from '../attachment/attachment.service';
import { assertSameSchool, type JwtUser } from '../../common/utils/tenant-guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateExecutionDto } from './dto/update-execution.dto';
import { CloseProjectDto } from './dto/close-project.dto';
import { CreateProcurementDto } from './dto/create-procurement.dto';

// ── สถานะงาน (task.status) ──
const TASK_DONE = 4;
const TASK_OPEN = [1, 2, 3, 5]; // ยังไม่เริ่ม/กำลังทำ/รอตรวจ/ติดขัด (ยังไม่จบ)
const TASK_CANCELLED = 9;

// ── สถานะดำเนินงานโครงการ (execution_status) ──
const EXEC_DRAFT = 1;
const EXEC_RUNNING = 3;
const EXEC_REVIEW = 4;
const EXEC_CLOSED = 5;
const EXEC_CANCELLED = 9;

// ── สถานะการเบิกจ่าย (request_withdraw.status) ──
const RW_PAID = [202]; // ออกเช็ค = ใช้จริง
const RW_COMMITTED = [100, 102, 200]; // ในกระบวนการอนุมัติ = ผูกพัน

const TASK_STATUS_NAME: Record<number, string> = {
  1: 'ยังไม่เริ่ม',
  2: 'กำลังทำ',
  3: 'รอตรวจ',
  4: 'เสร็จแล้ว',
  5: 'ติดขัด',
  9: 'ยกเลิก',
};

const EXEC_STATUS_NAME: Record<number, string> = {
  1: 'ร่าง',
  2: 'พร้อมดำเนินงาน',
  3: 'กำลังดำเนินงาน',
  4: 'รอตรวจสรุป',
  5: 'ปิดโครงการ',
  6: 'ติดขัด',
  9: 'ยกเลิก',
};

@Injectable()
export class ProjectWorkspaceService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectTask)
    private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(ParcelOrder)
    private readonly parcelOrderRepo: Repository<ParcelOrder>,
    @InjectRepository(RequestWithdraw)
    private readonly rwRepo: Repository<RequestWithdraw>,
    @InjectRepository(ProjectFollowup)
    private readonly followupRepo: Repository<ProjectFollowup>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepo: Repository<SchoolYear>,
    private readonly attachmentService: AttachmentService,
  ) {}

  // ───────────────────────── helpers ─────────────────────────

  /** โหลดโครงการ + ตรวจ tenant จาก record จริง (ไม่เชื่อ sc_id จาก request) */
  private async getProjectOrThrow(id: number, user: JwtUser): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { projId: id, del: 0 },
    });
    if (!project) throw new NotFoundException('ไม่พบโครงการ');
    assertSameSchool(user, project.scId ?? 0);
    return project;
  }

  /** map admin_id → ชื่อ */
  private async adminNameMap(ids: number[]): Promise<Map<number, string>> {
    const uniq = [...new Set(ids.filter((x) => !!x))];
    if (uniq.length === 0) return new Map();
    const admins = await this.adminRepo.find({
      where: { adminId: In(uniq) },
      select: ['adminId', 'name'],
    });
    return new Map(admins.map((a) => [a.adminId, a.name ?? '']));
  }

  /**
   * คำนวณ progress ใหม่จากงาน แล้ว cache ลง pln_project.progress_percent
   * progress = Σweight(เสร็จแล้ว) / Σweight(ไม่ยกเลิก) × 100
   * งานไม่ระบุ weight → ใช้ 1 (กระจายเท่ากัน)
   */
  async recalcProgress(projectId: number): Promise<number> {
    const tasks = await this.taskRepo.find({
      where: { projectId, del: 0 },
    });
    const active = tasks.filter((t) => t.status !== TASK_CANCELLED);
    const totalWeight = active.reduce((s, t) => s + (t.weight || 1), 0);
    const doneWeight = active
      .filter((t) => t.status === TASK_DONE)
      .reduce((s, t) => s + (t.weight || 1), 0);
    const progress =
      totalWeight > 0
        ? Math.round((doneWeight / totalWeight) * 100 * 100) / 100
        : 0;
    await this.projectRepo.update({ projId: projectId }, {
      progressPercent: progress,
    } as Partial<Project>);
    return progress;
  }

  /** จำนวนไฟล์แนบของ ref หนึ่ง ๆ */
  private async countAttachments(
    scId: number,
    refType: string,
    refId: number,
  ): Promise<number> {
    const res = await this.attachmentService.list(scId, refType, refId);
    return res.count;
  }

  private formatTask(t: ProjectTask, nameMap: Map<number, string>) {
    return {
      task_id: t.taskId,
      project_id: t.projectId,
      task_no: t.taskNo,
      title: t.title,
      detail: t.detail,
      assignee_admin_id: t.assigneeAdminId,
      assignee_name: t.assigneeAdminId
        ? (nameMap.get(t.assigneeAdminId) ?? '')
        : '',
      start_date: t.startDate,
      due_date: t.dueDate,
      status: t.status,
      status_name: TASK_STATUS_NAME[t.status] ?? '',
      weight: t.weight,
      sort_order: t.sortOrder,
      evidence_required: t.evidenceRequired,
      result_note: t.resultNote,
      blocked_reason: t.blockedReason,
      completed_date: t.completedDate,
    };
  }

  // ───────────────────────── workspace ─────────────────────────

  async getWorkspace(id: number, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    const scId = project.scId ?? 0;

    const [members, tasks, budget, evidenceCount] = await Promise.all([
      this.loadMembers(id),
      this.loadTasks(id),
      this.computeBudget(project),
      this.countAttachments(scId, 'project', id),
    ]);

    return {
      project: {
        proj_id: project.projId,
        proj_name: project.projName,
        proj_detail: project.projDetail,
        proj_budget: Number(project.projBudget),
        proj_owner: project.projOwner,
        owner_admin_id: project.ownerAdminId,
        department: project.department,
        sc_id: project.scId,
        sy_id: project.syId,
        proj_status: project.projStatus,
        execution_status: project.executionStatus,
        execution_status_name: EXEC_STATUS_NAME[project.executionStatus] ?? '',
        progress_percent: Number(project.progressPercent),
        start_date: project.startDate,
        end_date: project.endDate,
        expected_output: project.expectedOutput,
        success_indicator: project.successIndicator,
        closed_date: project.closedDate,
        cancel_reason: project.cancelReason,
      },
      members,
      tasks,
      budget,
      evidence_count: evidenceCount,
    };
  }

  // ───────────────────────── execution ─────────────────────────

  async updateExecution(id: number, dto: UpdateExecutionDto, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);

    // ตรวจกฎการเปลี่ยนสถานะ (PRD §9)
    if (dto.execution_status !== undefined) {
      await this.assertExecutionTransition(project, dto);
    }

    const patch: Partial<Project> = {};
    if (dto.owner_admin_id !== undefined) patch.ownerAdminId = dto.owner_admin_id;
    if (dto.start_date !== undefined) patch.startDate = dto.start_date;
    if (dto.end_date !== undefined) patch.endDate = dto.end_date;
    if (dto.expected_output !== undefined)
      patch.expectedOutput = dto.expected_output;
    if (dto.success_indicator !== undefined)
      patch.successIndicator = dto.success_indicator;
    if (dto.execution_status !== undefined) {
      patch.executionStatus = dto.execution_status;
      if (dto.execution_status === EXEC_CANCELLED) {
        patch.cancelReason = dto.cancel_reason ?? project.cancelReason ?? null;
      }
    }
    if (dto.cancel_reason !== undefined) patch.cancelReason = dto.cancel_reason;

    patch.upBy = user.admin_id;
    await this.projectRepo.update({ projId: id }, patch);
    return { flag: true, ms: 'บันทึกข้อมูลการดำเนินงานแล้ว' };
  }

  private async assertExecutionTransition(
    project: Project,
    dto: UpdateExecutionDto,
  ) {
    const target = dto.execution_status!;

    // ยกเลิก — ต้องมีเหตุผล
    if (target === EXEC_CANCELLED) {
      const reason = dto.cancel_reason ?? project.cancelReason;
      if (!reason || !reason.trim())
        throw new BadRequestException('การยกเลิกโครงการต้องระบุเหตุผล');
      return;
    }

    // เริ่มดำเนินงาน — ต้องอนุมัติแล้ว + มีเจ้าของ + มีวันสิ้นสุด
    if (target === EXEC_RUNNING) {
      const owner = dto.owner_admin_id ?? project.ownerAdminId;
      const endDate = dto.end_date ?? project.endDate;
      if (project.projStatus !== 1)
        throw new BadRequestException(
          'เริ่มดำเนินงานได้เมื่อโครงการได้รับการอนุมัติแล้ว',
        );
      if (!owner)
        throw new BadRequestException('ต้องกำหนดเจ้าของโครงการก่อนเริ่มดำเนินงาน');
      if (!endDate)
        throw new BadRequestException('ต้องกำหนดวันสิ้นสุดก่อนเริ่มดำเนินงาน');
      return;
    }

    // ส่งตรวจสรุป — ต้องไม่มีงานค้าง
    if (target === EXEC_REVIEW) {
      const openCount = await this.taskRepo.count({
        where: { projectId: project.projId, del: 0, status: In(TASK_OPEN) },
      });
      if (openCount > 0)
        throw new BadRequestException(
          `ยังมีงานค้าง ${openCount} รายการ — ต้องปิดงานทั้งหมดก่อนส่งตรวจสรุป`,
        );
      return;
    }

    // ปิดโครงการต้องผ่าน endpoint close (ตรวจเงื่อนไขครบ)
    if (target === EXEC_CLOSED) {
      throw new BadRequestException(
        'การปิดโครงการต้องใช้ปุ่ม "ปิดโครงการ" เพื่อตรวจเงื่อนไขให้ครบ',
      );
    }
  }

  // ───────────────────────── members ─────────────────────────

  private async loadMembers(projectId: number) {
    const members = await this.memberRepo.find({
      where: { projectId, del: 0 },
      order: { memberId: 'ASC' },
    });
    const nameMap = await this.adminNameMap(members.map((m) => m.adminId));
    return members.map((m) => ({
      member_id: m.memberId,
      project_id: m.projectId,
      admin_id: m.adminId,
      admin_name: nameMap.get(m.adminId) ?? '',
      project_role: m.projectRole,
      role_name: m.roleName,
      note: m.note,
    }));
  }

  async listMembers(id: number, user: JwtUser) {
    await this.getProjectOrThrow(id, user);
    return { data: await this.loadMembers(id) };
  }

  async addMember(id: number, dto: CreateMemberDto, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    const role = dto.project_role ?? 'member';

    // owner ได้คนเดียว — ถ้าตั้ง owner ใหม่ ให้ปลด owner เดิม
    if (role === 'owner') {
      await this.memberRepo.update(
        { projectId: id, projectRole: 'owner', del: 0 },
        { del: 1, upBy: user.admin_id },
      );
      await this.projectRepo.update(
        { projId: id },
        { ownerAdminId: dto.admin_id, upBy: user.admin_id },
      );
    }

    // กันซ้ำ (project + admin + role)
    const existing = await this.memberRepo.findOne({
      where: { projectId: id, adminId: dto.admin_id, projectRole: role, del: 0 },
    });
    if (existing) {
      return { flag: false, ms: 'สมาชิกรายนี้มีบทบาทนี้อยู่แล้ว' };
    }

    const row = this.memberRepo.create({
      projectId: id,
      adminId: dto.admin_id,
      projectRole: role,
      roleName: dto.role_name ?? null,
      note: dto.note ?? null,
      scId: project.scId ?? user.sc_id,
      upBy: user.admin_id,
      del: 0,
    });
    const saved = await this.memberRepo.save(row);
    return { flag: true, ms: 'เพิ่มสมาชิกแล้ว', member_id: saved.memberId };
  }

  async removeMember(id: number, memberId: number, user: JwtUser) {
    await this.getProjectOrThrow(id, user);
    const member = await this.memberRepo.findOne({
      where: { memberId, projectId: id, del: 0 },
    });
    if (!member) return { flag: false, ms: 'ไม่พบสมาชิก' };
    member.del = 1;
    member.upBy = user.admin_id;
    await this.memberRepo.save(member);
    if (member.projectRole === 'owner') {
      await this.projectRepo.update(
        { projId: id },
        { ownerAdminId: null, upBy: user.admin_id },
      );
    }
    return { flag: true, ms: 'นำสมาชิกออกแล้ว' };
  }

  // ───────────────────────── tasks ─────────────────────────

  private async loadTasks(projectId: number) {
    const tasks = await this.taskRepo.find({
      where: { projectId, del: 0 },
      order: { sortOrder: 'ASC', taskId: 'ASC' },
    });
    const nameMap = await this.adminNameMap(
      tasks.map((t) => t.assigneeAdminId ?? 0),
    );
    return tasks.map((t) => this.formatTask(t, nameMap));
  }

  async listTasks(id: number, user: JwtUser) {
    await this.getProjectOrThrow(id, user);
    return { data: await this.loadTasks(id) };
  }

  async createTask(id: number, dto: CreateTaskDto, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    const maxNo = await this.taskRepo
      .createQueryBuilder('t')
      .select('MAX(t.task_no)', 'max')
      .where('t.project_id = :id', { id })
      .andWhere('t.del = 0')
      .getRawOne<{ max: number }>();

    const row = this.taskRepo.create({
      projectId: id,
      taskNo: (Number(maxNo?.max ?? 0) || 0) + 1,
      title: dto.title,
      detail: dto.detail ?? null,
      assigneeAdminId: dto.assignee_admin_id ?? null,
      startDate: dto.start_date ?? null,
      dueDate: dto.due_date ?? null,
      status: 1,
      weight: dto.weight ?? 1,
      sortOrder: dto.sort_order ?? 0,
      evidenceRequired: dto.evidence_required ?? 0,
      scId: project.scId ?? user.sc_id,
      syId: dto.sy_id ?? project.syId ?? null,
      upBy: user.admin_id,
      del: 0,
    });
    const saved = await this.taskRepo.save(row);
    await this.recalcProgress(id);
    return { flag: true, ms: 'เพิ่มงานแล้ว', task_id: saved.taskId };
  }

  async updateTask(
    id: number,
    taskId: number,
    dto: UpdateTaskDto,
    user: JwtUser,
  ) {
    const project = await this.getProjectOrThrow(id, user);
    const task = await this.taskRepo.findOne({
      where: { taskId, projectId: id, del: 0 },
    });
    if (!task) throw new NotFoundException('ไม่พบงาน');

    // กฎ: ปิดงานเป็น "เสร็จแล้ว" — ถ้าบังคับหลักฐานต้องมีไฟล์แนบ
    if (dto.status === TASK_DONE && task.status !== TASK_DONE) {
      const requiresEvidence =
        (dto.evidence_required ?? task.evidenceRequired) === 1;
      if (requiresEvidence) {
        const count = await this.countAttachments(
          project.scId ?? user.sc_id,
          'project_task',
          taskId,
        );
        if (count === 0)
          throw new BadRequestException(
            'งานนี้กำหนดให้ต้องมีหลักฐาน — แนบไฟล์ก่อนจึงจะปิดงานได้',
          );
      }
      task.completedDate = new Date().toISOString().slice(0, 10);
      task.completedBy = user.admin_id;
    }
    // ออกจากสถานะเสร็จ → ล้าง completed
    if (dto.status !== undefined && dto.status !== TASK_DONE) {
      task.completedDate = null;
      task.completedBy = null;
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.detail !== undefined) task.detail = dto.detail;
    if (dto.assignee_admin_id !== undefined)
      task.assigneeAdminId = dto.assignee_admin_id;
    if (dto.start_date !== undefined) task.startDate = dto.start_date;
    if (dto.due_date !== undefined) task.dueDate = dto.due_date;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.weight !== undefined) task.weight = dto.weight;
    if (dto.sort_order !== undefined) task.sortOrder = dto.sort_order;
    if (dto.evidence_required !== undefined)
      task.evidenceRequired = dto.evidence_required;
    if (dto.result_note !== undefined) task.resultNote = dto.result_note;
    if (dto.blocked_reason !== undefined)
      task.blockedReason = dto.blocked_reason;
    task.upBy = user.admin_id;

    await this.taskRepo.save(task);
    await this.recalcProgress(id);
    return { flag: true, ms: 'บันทึกงานแล้ว' };
  }

  async removeTask(id: number, taskId: number, user: JwtUser) {
    await this.getProjectOrThrow(id, user);
    const task = await this.taskRepo.findOne({
      where: { taskId, projectId: id, del: 0 },
    });
    if (!task) return { flag: false, ms: 'ไม่พบงาน' };
    task.del = 1;
    task.upBy = user.admin_id;
    await this.taskRepo.save(task);
    await this.recalcProgress(id);
    return { flag: true, ms: 'ลบงานแล้ว' };
  }

  // ───────────────────────── budget ─────────────────────────

  /** รวมยอดเบิกจ่ายของโครงการจากเอกสารต้นทาง (ไม่ให้กรอกทับ) */
  private async computeBudget(project: Project) {
    const allocated = Number(project.projBudget ?? 0);
    const orders = await this.parcelOrderRepo.find({
      where: { projectId: project.projId, scId: project.scId ?? 0, del: 0 },
    });
    const orderIds = orders.map((o) => o.orderId);

    let actual = 0;
    let committed = 0;
    if (orderIds.length > 0) {
      const paid = await this.rwRepo
        .createQueryBuilder('rw')
        .select('SUM(rw.amount)', 'sum')
        .where('rw.order_id IN (:...ids)', { ids: orderIds })
        .andWhere('rw.del = 0')
        .andWhere('rw.status IN (:...st)', { st: RW_PAID })
        .getRawOne<{ sum: string }>();
      const commit = await this.rwRepo
        .createQueryBuilder('rw')
        .select('SUM(rw.amount)', 'sum')
        .where('rw.order_id IN (:...ids)', { ids: orderIds })
        .andWhere('rw.del = 0')
        .andWhere('rw.status IN (:...st)', { st: RW_COMMITTED })
        .getRawOne<{ sum: string }>();
      actual = Number(paid?.sum ?? 0);
      committed = Number(commit?.sum ?? 0);
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const remaining = round(allocated - actual - committed);
    const usedPercent =
      allocated > 0 ? round(((actual + committed) / allocated) * 100) : 0;

    return {
      allocated: round(allocated),
      committed: round(committed),
      actual: round(actual),
      remaining,
      used_percent: usedPercent,
      over_threshold: usedPercent >= 80,
      // อ้างอิงเอกสารต้นทาง (คลิกยอดเพื่อเปิด)
      orders: orders.map((o) => ({
        order_id: o.orderId,
        budgets: Number(o.budgets ?? 0),
        order_status: o.orderStatus,
      })),
    };
  }

  async getBudgetSummary(id: number, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    return this.computeBudget(project);
  }

  /**
   * สร้างรายการจัดซื้อ/จัดจ้าง (parcel_order) ใบใหม่ผูกกับโครงการ
   * → 1 โครงการมีได้หลายใบ (จัดซื้อหลายครั้ง) ใบใหม่เข้า workflow อนุมัติ (status=1)
   */
  async createProcurement(id: number, dto: CreateProcurementDto, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    if (project.executionStatus === EXEC_CLOSED) {
      throw new BadRequestException(
        'โครงการปิดแล้ว ไม่สามารถสร้างรายการจัดซื้อ/จัดจ้างได้',
      );
    }

    // acad_year ต้องเป็น budget_year (ปีจริง) เพื่อให้โผล่ในหน้าอนุมัติโครงการ
    let acadYear: number | null = null;
    if (project.syId) {
      const sy = await this.schoolYearRepo.findOne({
        where: { syId: project.syId },
      });
      acadYear = sy?.budgetYear ?? sy?.syYear ?? null;
    }

    const order = this.parcelOrderRepo.create({
      projectId: project.projId,
      projectType: dto.project_type ?? 1,
      scId: project.scId ?? user.sc_id,
      adminId: user.admin_id,
      orderDate: new Date(),
      orderStatus: 1,
      acadYear,
      details: dto.details?.trim() || project.projName,
      budgets: dto.budgets ?? 0,
      upBy: user.admin_id,
      del: 0,
    });
    const saved = await this.parcelOrderRepo.save(order);
    return {
      flag: true,
      ms: 'สร้างรายการจัดซื้อ/จัดจ้างแล้ว — ส่งเข้าขั้นตอนอนุมัติ',
      order_id: saved.orderId,
    };
  }

  // ───────────────────────── evidence ─────────────────────────

  async getEvidence(id: number, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    const scId = project.scId ?? 0;

    // หลักฐานโครงการ
    const projectFiles = await this.attachmentService.list(scId, 'project', id);

    // หลักฐานราย task
    const tasks = await this.taskRepo.find({
      where: { projectId: id, del: 0 },
      select: ['taskId', 'title'],
    });
    const taskFiles: Array<Record<string, unknown>> = [];
    for (const t of tasks) {
      const res = await this.attachmentService.list(
        scId,
        'project_task',
        t.taskId,
      );
      for (const f of res.data) {
        taskFiles.push({ ...f, source: 'task', source_title: t.title });
      }
    }

    // หลักฐานจากจัดซื้อ (parcel_order) — อ่านอย่างเดียว
    const orders = await this.parcelOrderRepo.find({
      where: { projectId: id, scId, del: 0 },
      select: ['orderId'],
    });
    const orderFiles: Array<Record<string, unknown>> = [];
    for (const o of orders) {
      const res = await this.attachmentService.list(
        scId,
        'parcel_order',
        o.orderId,
      );
      for (const f of res.data) {
        orderFiles.push({ ...f, source: 'parcel_order' });
      }
    }

    return {
      project: projectFiles.data.map((f) => ({ ...f, source: 'project' })),
      tasks: taskFiles,
      procurement: orderFiles,
    };
  }

  // ───────────────────────── close ─────────────────────────

  async closeProject(id: number, dto: CloseProjectDto, user: JwtUser) {
    const project = await this.getProjectOrThrow(id, user);
    const reasons: string[] = [];

    // 1) progress = 100
    const progress = await this.recalcProgress(id);
    if (progress < 100) reasons.push(`ความก้าวหน้ายังไม่ครบ 100% (${progress}%)`);

    // 2) ไม่มีงานค้าง
    const openCount = await this.taskRepo.count({
      where: { projectId: id, del: 0, status: In(TASK_OPEN) },
    });
    if (openCount > 0) reasons.push(`ยังมีงานค้าง ${openCount} รายการ`);

    // 3) หลักฐานบังคับครบ
    const evidenceTasks = await this.taskRepo.find({
      where: { projectId: id, del: 0, evidenceRequired: 1 },
      select: ['taskId', 'title'],
    });
    for (const t of evidenceTasks) {
      const count = await this.countAttachments(
        project.scId ?? 0,
        'project_task',
        t.taskId,
      );
      if (count === 0)
        reasons.push(`งาน "${t.title}" ยังไม่มีหลักฐานแนบ`);
    }

    // 4) มีรายงานสรุปปลายปี (period=5) ที่ส่งแล้ว (status≥2)
    const yearEnd = await this.followupRepo
      .createQueryBuilder('f')
      .where('f.project_id = :id', { id })
      .andWhere('f.del = 0')
      .andWhere('f.report_period = 5')
      .andWhere('f.status >= 2')
      .getCount();
    if (yearEnd === 0)
      reasons.push('ยังไม่ได้ส่งรายงานสรุปปลายปี');

    if (reasons.length > 0) {
      throw new BadRequestException(
        'ปิดโครงการไม่ได้: ' + reasons.join(' / '),
      );
    }

    await this.projectRepo.update(
      { projId: id },
      {
        executionStatus: EXEC_CLOSED,
        closedDate: new Date().toISOString().slice(0, 10),
        closedBy: user.admin_id,
        cancelReason: dto.reason ?? project.cancelReason ?? null,
        upBy: user.admin_id,
      },
    );
    return { flag: true, ms: 'ปิดโครงการเรียบร้อยแล้ว' };
  }

  // ───────────────────────── dashboard ─────────────────────────

  async getDashboard(scId: number, syId: number, user: JwtUser) {
    assertSameSchool(user, scId);
    const where: Record<string, unknown> = { scId, del: 0 };
    if (syId > 0) where.syId = syId;
    const projects = await this.projectRepo.find({
      where,
      order: { projId: 'DESC' },
    });

    const today = new Date();
    const ownerIds = projects.map((p) => p.ownerAdminId ?? 0);
    const nameMap = await this.adminNameMap(ownerIds);

    // ติดขัดราย task (มี task ติดขัด)
    const projIds = projects.map((p) => p.projId);
    const blockedSet = new Set<number>();
    if (projIds.length > 0) {
      const blocked = await this.taskRepo
        .createQueryBuilder('t')
        .select('DISTINCT t.project_id', 'pid')
        .where('t.project_id IN (:...ids)', { ids: projIds })
        .andWhere('t.del = 0')
        .andWhere('t.status = 5')
        .getRawMany<{ pid: number }>();
      blocked.forEach((b) => blockedSet.add(Number(b.pid)));
    }

    const rows = projects.map((p) => {
      const end = p.endDate ? new Date(p.endDate) : null;
      const progress = Number(p.progressPercent ?? 0);
      const running =
        p.executionStatus === EXEC_RUNNING || p.executionStatus === 6;
      const overdue = !!end && end < today && p.executionStatus !== EXEC_CLOSED;
      const atRisk =
        running && !!end && end < today && progress < 80;
      const blocked = blockedSet.has(p.projId);
      const daysSinceUpdate = p.updateDate
        ? Math.floor(
            (today.getTime() - new Date(p.updateDate).getTime()) / 86400000,
          )
        : null;
      return {
        proj_id: p.projId,
        proj_name: p.projName,
        department: p.department,
        proj_owner: p.projOwner,
        owner_admin_id: p.ownerAdminId,
        owner_name: p.ownerAdminId ? (nameMap.get(p.ownerAdminId) ?? '') : '',
        proj_budget: Number(p.projBudget ?? 0),
        proj_status: p.projStatus,
        execution_status: p.executionStatus,
        execution_status_name: EXEC_STATUS_NAME[p.executionStatus] ?? '',
        progress_percent: progress,
        start_date: p.startDate,
        end_date: p.endDate,
        overdue,
        at_risk: atRisk,
        blocked,
        stale: daysSinceUpdate !== null && daysSinceUpdate > 14,
      };
    });

    // เรียงเร่งด่วน/เกินกำหนดขึ้นก่อน
    rows.sort((a, b) => {
      const score = (r: typeof a) =>
        (r.overdue ? 4 : 0) + (r.blocked ? 2 : 0) + (r.at_risk ? 1 : 0);
      return score(b) - score(a);
    });

    const summary = {
      total: rows.length,
      running: rows.filter((r) => r.execution_status === EXEC_RUNNING).length,
      overdue: rows.filter((r) => r.overdue).length,
      blocked: rows.filter((r) => r.blocked).length,
      waiting_ack: 0, // เติมจาก followup ด้านล่าง
      closed: rows.filter((r) => r.execution_status === EXEC_CLOSED).length,
      draft: rows.filter((r) => r.execution_status === EXEC_DRAFT).length,
    };

    // รายงานรอรับทราบ (followup ส่งแล้ว status=2)
    if (projIds.length > 0) {
      summary.waiting_ack = await this.followupRepo
        .createQueryBuilder('f')
        .where('f.project_id IN (:...ids)', { ids: projIds })
        .andWhere('f.del = 0')
        .andWhere('f.status = 2')
        .getCount();
    }

    const totalBudget = rows.reduce((s, r) => s + r.proj_budget, 0);

    return { summary, total_budget: totalBudget, data: rows };
  }

  // ───────────────────────── my tasks ─────────────────────────

  async getMyTasks(scId: number, user: JwtUser) {
    assertSameSchool(user, scId);
    const tasks = await this.taskRepo.find({
      where: {
        scId,
        del: 0,
        assigneeAdminId: user.admin_id,
        status: In(TASK_OPEN),
      },
    });
    const projIds = [...new Set(tasks.map((t) => t.projectId))];
    const projMap = new Map<number, string>();
    if (projIds.length > 0) {
      const projs = await this.projectRepo.find({
        where: { projId: In(projIds) },
        select: ['projId', 'projName'],
      });
      projs.forEach((p) => projMap.set(p.projId, p.projName));
    }

    const today = new Date();
    const data = tasks.map((t) => {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      const daysLeft = due
        ? Math.floor((due.getTime() - today.getTime()) / 86400000)
        : null;
      return {
        task_id: t.taskId,
        project_id: t.projectId,
        project_name: projMap.get(t.projectId) ?? '',
        title: t.title,
        status: t.status,
        status_name: TASK_STATUS_NAME[t.status] ?? '',
        due_date: t.dueDate,
        days_left: daysLeft,
        overdue: daysLeft !== null && daysLeft < 0,
        weight: t.weight,
        evidence_required: t.evidenceRequired,
      };
    });

    // เกินกำหนดก่อน แล้วใกล้ครบกำหนด
    data.sort((a, b) => {
      const av = a.days_left ?? 9999;
      const bv = b.days_left ?? 9999;
      return av - bv;
    });

    return { data };
  }
}
