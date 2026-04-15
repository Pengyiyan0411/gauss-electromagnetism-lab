import { BasePlugin, PluginContext } from '../../core/plugin-manager';

export class WebGPUMonitorPlugin implements BasePlugin<any> {
  name = 'webgpu:monitor';
  version = '1.0.0';
  private frameCount = 0;
  private lastTime = performance.now();
  private timer = 0;

  install(context: PluginContext<any>) {}

  activate() {
    const monitorHTML = `
      <div data-plugin-owner="${this.name}" class="absolute top-4 left-4 bg-black/80 text-green-400 font-mono text-xs p-2 rounded border border-green-500/30 z-50">
          <div>FPS: <span id="fps-counter">60</span></div>
          <div>Mode: <span id="render-mode">WebGPU Parallel</span></div>
      </div>
    `;
    document.getElementById('canvas-container')?.insertAdjacentHTML('beforeend', monitorHTML);

    const updateFPS = () => {
      this.timer = requestAnimationFrame(updateFPS);
      const now = performance.now();
      this.frameCount++;
      if (now >= this.lastTime + 1000) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        const el = document.getElementById('fps-counter');
        if (el) el.textContent = fps.toString();
        this.frameCount = 0;
        this.lastTime = now;
      }
    };
    updateFPS();
  }

  deactivate() { cancelAnimationFrame(this.timer); }
  uninstall() {
    this.deactivate();
    document.querySelectorAll(`[data-plugin-owner="${this.name}"]`).forEach(el => el.remove());
  }
}
