import { ApiProperty } from '@nestjs/swagger';
import { StudentResponseDto } from './student-response.dto';

export class BulkImportRowErrorDto {
  @ApiProperty({
    description: 'CSV 파일 내 행 번호 (헤더 제외, 1부터 시작)',
    example: 3,
  })
  row: number;

  @ApiProperty({
    description: '해당 행에서 읽은 이름 (있는 경우)',
    required: false,
    example: '김민준',
  })
  name?: string;

  @ApiProperty({
    description: '검증 실패 사유 목록',
    type: [String],
    example: ['학부모 연락처를 입력해주세요.'],
  })
  errors: string[];
}

export class BulkImportSkippedDto {
  @ApiProperty({ description: 'CSV 파일 내 행 번호', example: 5 })
  row: number;

  @ApiProperty({ example: '이서연' })
  name: string;

  @ApiProperty({
    description: '건너뛴 사유',
    example: '동일한 이름/학부모 연락처의 원생이 이미 등록되어 있습니다.',
  })
  reason: string;
}

export class BulkImportResultDto {
  @ApiProperty({ description: '헤더를 제외한 전체 데이터 행 수', example: 42 })
  totalRows: number;

  @ApiProperty({ description: '신규 등록된 원생 수', example: 38 })
  createdCount: number;

  @ApiProperty({ description: '중복으로 건너뛴 행 수', example: 3 })
  skippedCount: number;

  @ApiProperty({ description: '검증 실패로 등록되지 않은 행 수', example: 1 })
  failedCount: number;

  @ApiProperty({
    type: [StudentResponseDto],
    description: '신규 등록된 원생 목록',
  })
  created: StudentResponseDto[];

  @ApiProperty({
    type: [BulkImportSkippedDto],
    description: '중복으로 건너뛴 행 상세',
  })
  skipped: BulkImportSkippedDto[];

  @ApiProperty({
    type: [BulkImportRowErrorDto],
    description: '검증 실패한 행 상세',
  })
  failed: BulkImportRowErrorDto[];
}
