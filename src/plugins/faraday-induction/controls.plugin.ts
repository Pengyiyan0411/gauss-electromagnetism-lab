import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class FaradayControlsPlugin implements BasePlugin<AppState> {
  name = 'faraday:controls';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private sliders: Record<string, HTMLInputElement> = {};
  private displays: Record<string, HTMLElement> = {};
  private onInputMap: Record<string, EventListener> = {};

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    // 🌟 无敌挂载定位：兼容所有版本的全息面板
    let controlContainer = document.querySelector('.mt-4.grid') || document.querySelector('.bg-slate-900 > div.mt-4');
    if (!controlContainer) {
        const titles = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('控制矩阵'));
        if (titles.length > 0) controlContainer = titles[titles.length - 1].parentElement;
    }
    if (!controlContainer) return;

    controlContainer.innerHTML = `
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">
              线圈面积 (A): <span id="valArea" class="text-white font-mono ml-2">${this.context.state.state.coilArea || 16}</span>
          </label>
          <input type="range" id="coilAreaSlider" min="5" max="30" step="1" value="${this.context.state.state.coilArea || 16}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">
              旋转角速度 (ω): <span id="valOmega" class="text-white font-mono ml-2">${this.context.state.state.coilOmega?.toFixed(1) || 1.0}</span>
          </label>
          <input type="range" id="coilOmegaSlider" min="0" max="5" step="0.1" value="${this.context.state.state.coilOmega || 1.0}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
    `;

    const bindings = [
      { id: 'coilAreaSlider', disp: 'valArea', stateKey: 'coilArea' },
      { id: 'coilOmegaSlider', disp: 'valOmega', stateKey: 'coilOmega' }
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
    Object.keys(this.sliders).forEach(k => this.sliders[k]?.removeEventListener('input', this.onInputMap[k]));
  }
  uninstall() {}
}