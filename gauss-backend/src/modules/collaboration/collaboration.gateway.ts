import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard'; // WebSocket 专属鉴权

/**
 * 启用 WebSocket，并设置跨域
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/physics-collab' })
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`📡 客户端已连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 客户端已断开: ${client.id}`);
  }

  /**
   * 加入特定实验室房间
   */
  @SubscribeMessage('joinRoom')
  @UseGuards(WsJwtGuard) // 确保只有登录用户能加入协作
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(data.roomId);
    // 通知房间内其他人
    client.to(data.roomId).emit('userJoined', { userId: client.id, msg: '新物理学家加入了实验室' });
  }

  /**
   * 🌟 核心：以 60帧/秒 接收并广播物理参数的细微变化 (滑块拖动、手势变化)
   */
  @SubscribeMessage('syncPhysicsState')
  handleSyncState(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string, stateUpdate: any }) {
    // 将状态变化 (如 radius: 10.5) 广播给房间内的所有人，除了发送者自己
    client.to(payload.roomId).emit('physicsStateUpdated', {
      byUserId: client.id,
      updates: payload.stateUpdate
    });
  }
}