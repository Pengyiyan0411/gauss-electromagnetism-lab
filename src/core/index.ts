import { EventEmitter } from './event-emitter';
import { StateManager } from './state';
import { LifecycleManager, AppLifecycle } from './lifecycle';
import { PluginManager, BasePlugin } from './plugin-manager';

export class Kernel<T extends object> {
  public events: EventEmitter;
  public state: StateManager<T>;
  public lifecycle: LifecycleManager;
  public plugins: PluginManager<T>;

  constructor(initialState: T) {
    this.events = new EventEmitter();
    this.state = new StateManager<T>(initialState);
    this.lifecycle = new LifecycleManager();
    this.plugins = new PluginManager<T>({ events: this.events, state: this.state });
  }

  public start(): void {
    this.lifecycle.trigger(AppLifecycle.INIT);
    this.lifecycle.trigger(AppLifecycle.MOUNTED);
  }
}
