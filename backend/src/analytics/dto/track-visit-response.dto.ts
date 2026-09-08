import { ApiProperty } from '@nestjs/swagger';

export class TrackVisitResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
