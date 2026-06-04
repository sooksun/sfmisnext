import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenPlnReceiveDetailText1777620000000
  implements MigrationInterface
{
  name = 'WidenPlnReceiveDetailText1777620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `pln_receive_detail` MODIFY `prd_detail` varchar(255) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `pln_receive_detail` MODIFY `prd_detail` varchar(45) NULL',
    );
  }
}
