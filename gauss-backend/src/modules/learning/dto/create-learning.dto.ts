import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLearningDto {
  @ApiProperty({ description: '知识点路由标识', example: 'gauss-electric' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({ description: '掌握度百分比', example: 80.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  mastery: number;
}