import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class GaussMagneticControlsPlugin implements BasePlugin<AppState> {
  name = 'gauss:magnetic:controls';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private sliders: Record<string, HTMLInputElement> = {};
  private displays: Record<string, HTMLElement> = {};
  private onInputMap: Record<string, EventListener> = {};

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    let controlContainer = document.querySelector('.mt-4.grid') || document.querySelector('.bg-slate-900 > div.mt-4');
    if (!controlContainer) {
        const titles = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('控制矩阵'));
        if (titles.length > 0) controlContainer = titles[titles.length - 1].parentElement;
    }
    if (!controlContainer) return;

    controlContainer.innerHTML = `
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">高斯球半径 (R): <span id="valMagR" class="text-white font-mono ml-2">${this.context.state.state.radius.toFixed(1)}</span></label>
          <input type="range" id="magRadiusSlider" min="1" max="15" step="0.1" value="${this.context.state.state.radius}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">磁偶极子强度: <span id="valMagStrength" class="text-white font-mono ml-2">${this.context.state.state.magnetStrength || 5.0}</span></label>
          <input type="range" id="magStrengthSlider" min="1" max="10" step="0.1" value="${this.context.state.state.magnetStrength || 5}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">X 轴位置: <span id="valMagX" class="text-white font-mono ml-2">${this.context.state.state.x.toFixed(1)}</span></label>
          <input type="range" id="magXSlider" min="-12" max="12" step="0.1" value="${this.context.state.state.x}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">Y 轴位置: <span id="valMagY" class="text-white font-mono ml-2">${this.context.state.state.y.toFixed(1)}</span></label>
          <input type="range" id="magYSlider" min="-12" max="12" step="0.1" value="${this.context.state.state.y}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
    `;

    const bindings = [
      { id: 'magRadiusSlider', disp: 'valMagR', stateKey: 'radius' },
      { id: 'magXSlider', disp: 'valMagX', stateKey: 'x' },
      { id: 'magYSlider', disp: 'valMagY', stateKey: 'y' },
      { id: 'magStrengthSlider', disp: 'valMagStrength', stateKey: 'magnetStrength' }
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

  deactivate() { Object.keys(this.sliders).forEach(k => this.sliders[k]?.removeEventListener('input', this.onInputMap[k])); }
  uninstall() {}
}