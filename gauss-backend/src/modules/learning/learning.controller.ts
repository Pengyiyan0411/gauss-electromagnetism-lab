import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { CreateLearningDto } from './dto/create-learning.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('学习进度系统 (Learning)')
@Controller('learning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post('sync')
  @ApiOperation({ summary: '同步前端答题掌握度到云端' })
  async syncMastery(@Req() req: any, @Body() dto: CreateLearningDto) {
    return this.learningService.syncMastery(req.user.userId, dto.topic, dto.mastery);
  }

  @Get('progress')
  @ApiOperation({ summary: '获取当前用户的所有物理知识点掌握度' })
  async getMyProgress(@Req() req: any) {
    return this.learningService.getUserProgress(req.user.userId);
  }
}