import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventResponseDto } from './dto/event-response.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. 학원 이벤트 목록 조회
   *
   * 학원 전체 이벤트를 시작일 기준 오름차순으로 반환한다. 프론트엔드가 월/주 단위
   * 뷰를 클라이언트에서 계산하므로 별도 날짜 필터는 두지 않는다(현재 호출부와 동일하게).
   */
  async findAll(academyId: number): Promise<EventResponseDto[]> {
    const events = await this.prisma.academyEvent.findMany({
      where: { academyId },
      orderBy: { startDate: 'asc' },
    });

    return events.map((event) => this.mapToResponseDto(event));
  }

  /**
   * 2. 학원 이벤트 생성
   */
  async create(
    academyId: number,
    dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.prisma.academyEvent.create({
      data: {
        academyId,
        title: dto.title,
        category: dto.category,
        color: dto.color,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description: dto.description,
      },
    });

    return this.mapToResponseDto(event);
  }

  /**
   * 3. 학원 이벤트 수정
   */
  async update(
    academyId: number,
    id: number,
    dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const existing = await this.prisma.academyEvent.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('해당 이벤트를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.academyEvent.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        color: dto.color,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description: dto.description,
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 4. 학원 이벤트 삭제
   */
  async remove(academyId: number, id: number): Promise<{ message: string }> {
    const existing = await this.prisma.academyEvent.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('해당 이벤트를 찾을 수 없습니다.');
    }

    await this.prisma.academyEvent.delete({ where: { id } });

    return { message: '이벤트가 삭제되었습니다.' };
  }

  /**
   * Helper: DTO Mapping (날짜/시각 필드를 YYYY-MM-DD 문자열로 변환)
   */
  private mapToResponseDto(event: any): EventResponseDto {
    return {
      id: event.id,
      academyId: event.academyId,
      title: event.title,
      category: event.category,
      color: event.color,
      startDate:
        event.startDate instanceof Date
          ? event.startDate.toISOString().split('T')[0]
          : event.startDate,
      endDate: event.endDate
        ? event.endDate instanceof Date
          ? event.endDate.toISOString().split('T')[0]
          : event.endDate
        : null,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
