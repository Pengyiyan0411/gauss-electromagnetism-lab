import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 用于在 Controller 中快捷获取当前登录用户：@CurrentUser() user: any
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);