import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

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

    // Map entity fields to frontend expected format
    const formattedData = items.map((item) => ({
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
      proj_budget: Number(item.projBudget),
      proj_status: item.projStatus,
      pbc_id: item.pbcId,
      sc_id: item.scId,
      sy_id: item.syId,
      up_by: item.upBy,
      create_date: item.createDate
        ? item.createDate.toISOString().split('T')[0]
        : null,
      del: item.del,
    }));

    return {
      data: formattedData,
      count,
      page,
      pageSize,
    };
  }

  async addProject(payload: CreateProjectDto) {
    const project = new Project();
    project.projName = payload.proj_name;
    project.projDetail = payload.proj_detail || null;
    project.projBudget = payload.proj_budget || 0;
    project.pbcId = payload.pbc_id || null;
    project.scId = payload.sc_id || null;
    project.syId = payload.sy_id || null;
    project.upBy = payload.up_by || null;
    project.projStatus = 0;
    project.del = 0;

    await this.projectRepository.save(project);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateProject(payload: UpdateProjectDto) {
    const project = await this.projectRepository.findOne({
      where: { projId: payload.proj_id, del: 0 },
    });

    if (!project) {
      return { flag: false, ms: 'ไม่พบข้อมูลโครงการ' };
    }

    if (payload.proj_name !== undefined) project.projName = payload.proj_name;
    if (payload.proj_detail !== undefined)
      project.projDetail = payload.proj_detail;
    if (payload.proj_budget !== undefined)
      project.projBudget = payload.proj_budget;
    if (payload.pbc_id !== undefined) project.pbcId = payload.pbc_id;
    if (payload.sc_id !== undefined) project.scId = payload.sc_id;
    if (payload.sy_id !== undefined) project.syId = payload.sy_id;
    if (payload.up_by !== undefined) project.upBy = payload.up_by;
    if (payload.proj_status !== undefined)
      project.projStatus = payload.proj_status;

    project.updateDate = new Date();
    await this.projectRepository.save(project);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeProject(projId: number) {
    const project = await this.projectRepository.findOne({
      where: { projId, del: 0 },
    });

    if (!project) {
      return { flag: false, ms: 'ไม่พบข้อมูลโครงการ' };
    }

    project.del = 1;
    project.updateDate = new Date();
    await this.projectRepository.save(project);
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
