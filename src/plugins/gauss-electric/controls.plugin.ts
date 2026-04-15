import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class GaussControlsPlugin implements BasePlugin<AppState> {
  name = 'gauss:electric:controls';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  
  private sliders: Record<string, HTMLInputElement> = {};
  private displays: Record<string, HTMLElement> = {};
  private onInputMap: Record<string, EventListener> = {};

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    // 终极兼容：直接抓取毛玻璃面板内的 grid 容器
    const controlContainer = document.querySelector('.mt-4.grid') as HTMLElement;
    if (!controlContainer) return;

    controlContainer.innerHTML = `
      <div class="col-span-2 md:col-span-1">
          <label class="block text-slate-300 text-sm font-bold mb-1">高斯球半径 (R): <span id="valR" class="text-white font-mono ml-2">${this.context.state.state.radius.toFixed(1)}</span></label>
          <input type="range" id="radiusSlider" min="1" max="15" step="0.1" value="${this.context.state.state.radius}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1">
          <label class="block text-slate-300 text-sm font-bold mb-1">X 轴位置: <span id="valX" class="text-white font-mono ml-2">${this.context.state.state.x.toFixed(1)}</span></label>
          <input type="range" id="xSlider" min="-12" max="12" step="0.1" value="${this.context.state.state.x}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1">
          <label class="block text-slate-300 text-sm font-bold mb-1">Y 轴位置: <span id="valY" class="text-white font-mono ml-2">${this.context.state.state.y.toFixed(1)}</span></label>
          <input type="range" id="ySlider" min="-12" max="12" step="0.1" value="${this.context.state.state.y}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1">
          <label class="block text-slate-300 text-sm font-bold mb-1">Z 轴位置: <span id="valZ" class="text-white font-mono ml-2">${this.context.state.state.z.toFixed(1)}</span></label>
          <input type="range" id="zSlider" min="-12" max="12" step="0.1" value="${this.context.state.state.z}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
    `;

    const bindings = [
      { id: 'radiusSlider', disp: 'valR', stateKey: 'radius' },
      { id: 'xSlider', disp: 'valX', stateKey: 'x' },
      { id: 'ySlider', disp: 'valY', stateKey: 'y' },
      { id: 'zSlider', disp: 'valZ', stateKey: 'z' }
    ];

    bindings.forEach(b => {
      this.sliders[b.stateKey] = document.getElementById(b.id) as HTMLInputElement;
      this.displays[b.stateKey] = document.getElementById(b.disp) as HTMLElement;
      const listener = (e: Event) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.displays[b.stateKey].textContent = val.toFixed(1);
        this.context.state.setState({ [b.stateKey]: val } as Partial<AppState>);
      };
      this.onInputMap[b.stateKey] = listener;
      this.sliders[b.stateKey].addEventListener('input', listener);
    });
  }

  deactivate() {
    Object.keys(this.sliders).forEach(key => {
      if (this.sliders[key] && this.onInputMap[key]) this.sliders[key].removeEventListener('input', this.onInputMap[key]);
    });
    const controlContainer = document.querySelector('.mt-4.grid');
    if (controlContainer) controlContainer.innerHTML = '';
  }

  uninstall() { this.sliders = {}; this.displays = {}; this.onInputMap = {}; }
}