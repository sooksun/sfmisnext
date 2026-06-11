import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CrossDomainGuardService } from './cross-domain-guard.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

describe('CrossDomainGuardService', () => {
  let service: CrossDomainGuardService;
  let dataSource: { query: jest.Mock };
  let regulatoryConfig: { getThreshold: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };
    regulatoryConfig = { getThreshold: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossDomainGuardService,
        { provide: DataSource, useValue: dataSource },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
      ],
    }).compile();

    service = module.get(CrossDomainGuardService);
  });

  describe('G1 assertProjectNotOvercommitted', () => {
    it('ไม่ผูกโครงการ → ไม่ตรวจ (ไม่ query)', async () => {
      await service.assertProjectNotOvercommitted({
        scId: 1,
        projectId: 0,
        newAmount: 999,
      });
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('ปิด config (block=0) → ไม่ throw แม้เกินงบ', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(0);
      await expect(
        service.assertProjectNotOvercommitted({
          scId: 1,
          projectId: 5,
          newAmount: 999999,
        }),
      ).resolves.toBeUndefined();
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('เปิด config + ก่อหนี้เกินงบ → throw', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query
        .mockResolvedValueOnce([{ proj_budget: 100000 }]) // proj budget
        .mockResolvedValueOnce([{ committed: 80000 }]); // committed
      await expect(
        service.assertProjectNotOvercommitted({
          scId: 1,
          projectId: 5,
          newAmount: 30000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('เปิด config + ยังไม่เกินงบ → ไม่ throw', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query
        .mockResolvedValueOnce([{ proj_budget: 100000 }])
        .mockResolvedValueOnce([{ committed: 80000 }]);
      await expect(
        service.assertProjectNotOvercommitted({
          scId: 1,
          projectId: 5,
          newAmount: 20000,
        }),
      ).resolves.toBeUndefined();
    });

    it('งบโครงการ = 0 → ไม่บังคับ (ไม่ throw)', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query.mockResolvedValueOnce([{ proj_budget: 0 }]);
      await expect(
        service.assertProjectNotOvercommitted({
          scId: 1,
          projectId: 5,
          newAmount: 999999,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('G2 assertContractWithinOrder', () => {
    it('เปิด config + สัญญาเกินคำสั่งซื้อ → throw', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query.mockResolvedValueOnce([{ budgets: 50000 }]);
      await expect(
        service.assertContractWithinOrder({
          scId: 1,
          orderId: 7,
          contractTotal: 60000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('เปิด config + สัญญาไม่เกิน → ไม่ throw', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query.mockResolvedValueOnce([{ budgets: 50000 }]);
      await expect(
        service.assertContractWithinOrder({
          scId: 1,
          orderId: 7,
          contractTotal: 50000,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('G3 checkPayBeforeInspection', () => {
    it('ไม่ผูกคำสั่งซื้อ → null', async () => {
      expect(
        await service.checkPayBeforeInspection({ scId: 1, orderId: 0 }),
      ).toBeNull();
    });

    it('ปิด config → null แม้ยังไม่ตรวจรับ', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(0);
      expect(
        await service.checkPayBeforeInspection({ scId: 1, orderId: 7 }),
      ).toBeNull();
    });

    it('เปิด config + ยังไม่ตรวจรับ → คืนข้อความ', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query.mockResolvedValueOnce([]); // ไม่มี inspection
      const msg = await service.checkPayBeforeInspection({
        scId: 1,
        orderId: 7,
      });
      expect(typeof msg).toBe('string');
    });

    it('เปิด config + ตรวจรับผ่าน+ลงสต็อก → null', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(1);
      dataSource.query.mockResolvedValueOnce([
        { insp_result: 1, stock_posted: 1 },
      ]);
      expect(
        await service.checkPayBeforeInspection({ scId: 1, orderId: 7 }),
      ).toBeNull();
    });
  });
});
