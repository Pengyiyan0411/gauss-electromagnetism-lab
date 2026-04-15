export enum AppLifecycle {
  INIT = 'INIT',
  MOUNTED = 'MOUNTED',
  FOREGROUND = 'FOREGROUND',
  BACKGROUND = 'BACKGROUND',
  DESTROYED = 'DESTROYED'
}

export class LifecycleManager {
  private hooks: Map<AppLifecycle, Function[]> = new Map();

  public register(stage: AppLifecycle, callback: Function): void {
    if (!this.hooks.has(stage)) this.hooks.set(stage, []);
    this.hooks.get(stage)!.push(callback);
  }

  public trigger(stage: AppLifecycle): void {
    const callbacks = this.hooks.get(stage);
    if (callbacks) callbacks.forEach(cb => cb());
  }
}