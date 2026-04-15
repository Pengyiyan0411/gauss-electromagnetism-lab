/**
 * 响应式状态管理 - 状态变更监听、只读保护、变更日志
 */
export interface StateChangeLog {
  timestamp: number;
  prop: string;
  oldValue: any;
  newValue: any;
}

export class StateManager<T extends object> {
  private _state: T;
  private history: StateChangeLog[] = [];
  private listeners: Array<(prop: string, newValue: any, oldValue: any) => void> = [];

  constructor(initialState: T) {
    this._state = this.createProxy(initialState);
  }

  private createProxy(target: T): T {
    return new Proxy(target, {
      set: (obj, prop: string, value: any) => {
        const oldValue = (obj as any)[prop];
        if (oldValue !== value) {
          // 记录日志
          this.history.push({
            timestamp: Date.now(),
            prop,
            oldValue,
            newValue: value
          });
          // 修改值
          (obj as any)[prop] = value;
          // 触发监听
          this.notifyListeners(prop, value, oldValue);
        }
        return true;
      }
    });
  }

  public get state(): Readonly<T> {
    return this._state;
  }

  public setState(updates: Partial<T>): void {
    Object.assign(this._state, updates);
  }

  public watch(listener: (prop: string, newValue: any, oldValue: any) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(prop: string, newValue: any, oldValue: any): void {
    this.listeners.forEach(listener => listener(prop, newValue, oldValue));
  }

  public getHistory(): StateChangeLog[] {
    return [...this.history];
  }
}
