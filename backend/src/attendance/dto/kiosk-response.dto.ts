import { ApiProperty } from '@nestjs/swagger';

export class KioskClassOptionDto {
  @ApiProperty({ description: '수업 반 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '수업 반 이름', example: '중2 수학 A반' })
  name: string;
}

export class KioskStudentMatchDto {
  @ApiProperty({ description: '학생 ID', example: 1 })
  studentId: number;

  @ApiProperty({ description: '학생 이름 (본인 확인용)', example: '김민준' })
  studentName: string;

  @ApiProperty({
    description:
      '체크인 가능한 수업 목록. 오늘 요일에 해당하는 수업이 있으면 그것만, 없으면 등록된 전체 수업을 반환합니다.',
    type: [KioskClassOptionDto],
  })
  classes: KioskClassOptionDto[];
}

export class KioskLookupResponseDto {
  @ApiProperty({
    description:
      '입력한 전화번호 뒷자리와 일치하는 학생 목록 (형제/자매 등으로 여러 명일 수 있음)',
    type: [KioskStudentMatchDto],
  })
  matches: KioskStudentMatchDto[];
}
