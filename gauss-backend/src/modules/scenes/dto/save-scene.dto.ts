import { IsNotEmpty, IsObject, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveSceneDto {
  @ApiProperty({ description: '场景标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '活跃的知识点路由' })
  @IsString()
  @IsNotEmpty()
  activeTopic: string;

  @ApiProperty({ description: '前端 AppState 数据结构' })
  @IsObject()
  stateData: Record<string, any>;

  @ApiProperty({ description: '是否公开分享', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}