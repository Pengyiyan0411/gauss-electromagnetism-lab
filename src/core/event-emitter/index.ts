/**
 * 全局事件总线 - 支持命名空间和事件溯源
 */
export type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  /**
   * 订阅事件
   * @param event 事件名称 (如: 'gauss:electric:radiusChange')
   * @param handler 回调函数
   */
  public on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  /**
   * 取消订阅
   */
  public off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      this.events.set(event, handlers.filter(h => h !== handler));
    }
  }

  /**
   * 订阅一次性事件
   */
  public once(event: string, handler: EventHandler): void {
    const wrapper = (...args: any[]) => {
      handler(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * 发布事件
   */
  public emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      // 事件溯源日志（开发环境下）
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Event Emitted]: ${event}`, args);
      }
      handlers.forEach(handler => handler(...args));
    }
  }
}