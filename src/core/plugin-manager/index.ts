import { EventEmitter } from '../event-emitter';
import { StateManager } from '../state';

export interface BasePlugin<T = any> {
  name: string;
  version: string;
  dependencies?: string[];
  install: (context: PluginContext<T>) => void;
  activate: () => void;
  deactivate: () => void;
  uninstall: () => void;
}

export interface PluginContext<T> {
  events: EventEmitter;
  state: StateManager<T>;
}

export class PluginManager<T extends object> {
  private plugins: Map<string, BasePlugin<T>> = new Map();
  private activePlugins: Set<string> = new Set();
  private context: PluginContext<T>;

  constructor(context: PluginContext<T>) {
    this.context = context;
  }

  public register(plugin: BasePlugin<T>): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin [${plugin.name}] is already registered.`);
    }
    // 依赖检测
    if (plugin.dependencies) {
      plugin.dependencies.forEach(dep => {
        if (!this.plugins.has(dep)) {
          console.warn(`Plugin [${plugin.name}] depends on [${dep}] which is not registered.`);
        }
      });
    }
    this.plugins.set(plugin.name, plugin);
    plugin.install(this.context);
  }

  public activate(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && !this.activePlugins.has(name)) {
      plugin.activate();
      this.activePlugins.add(name);
    }
  }

  public deactivate(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin && this.activePlugins.has(name)) {
      plugin.deactivate();
      this.activePlugins.delete(name);
    }
  }

  public uninstall(name: string): void {
    this.deactivate(name);
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.uninstall();
      this.plugins.delete(name);
      
      // 内存泄漏强制校验
      setTimeout(() => {
        const leftoverDOM = document.querySelectorAll(`[data-plugin-owner="${name}"]`);
        if (leftoverDOM.length > 0) {
          console.error(`[PluginManager] Memory Leak: Plugin ${name} left ${leftoverDOM.length} DOM elements!`);
        }
      }, 100);
    }
  }
}
