import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { SaveSceneDto } from './dto/scene.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('实验场景同步 (Scenes)')
@Controller('scenes')
export class ScenesController {
  // 注入 ScenesService
  constructor(private readonly scenesService: ScenesService) {}

  @Post('save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '保存当前 3D 物理引擎状态至云端' })
  async saveScene(@Req() req: any, @Body() dto: SaveSceneDto) {
    // req.user 由 JwtAuthGuard 自动解析 Token 后注入
    // dto 由 SaveSceneDto 自动校验格式
    return this.scenesService.saveState(req.user.userId, dto);
  }

  @Get('community')
  @ApiOperation({ summary: '获取社区公开分享的精选实验配置' })
  async getPublicScenes() {
    return this.scenesService.findPublicScenes();
  }
}