import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class PoyntingControlsPlugin implements BasePlugin<AppState> {
  name = 'poynting:controls';
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
          <label class="block text-slate-300 text-sm font-bold mb-1">电磁波频率 (f): <span id="valWaveFreq" class="text-white font-mono ml-2">${this.context.state.state.waveFreq?.toFixed(1) || 1.0}</span></label>
          <input type="range" id="waveFreqSlider" min="0.1" max="5.0" step="0.1" value="${this.context.state.state.waveFreq || 1.0}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 md:col-span-1 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">电场振幅 (E₀): <span id="valWaveAmp" class="text-white font-mono ml-2">${this.context.state.state.waveAmp?.toFixed(1) || 3.0}</span></label>
          <input type="range" id="waveAmpSlider" min="1.0" max="10.0" step="0.5" value="${this.context.state.state.waveAmp || 3.0}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
      <div class="col-span-2 mt-2">
          <label class="block text-slate-300 text-sm font-bold mb-1">介电常数 (ε_r): <span id="valEpsilon" class="text-white font-mono ml-2">${this.context.state.state.epsilon?.toFixed(1) || 1.0}</span></label>
          <input type="range" id="epsilonSlider" min="1.0" max="9.0" step="0.5" value="${this.context.state.state.epsilon || 1.0}" class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer">
      </div>
    `;

    const bindings = [
      { id: 'waveFreqSlider', disp: 'valWaveFreq', stateKey: 'waveFreq' },
      { id: 'waveAmpSlider', disp: 'valWaveAmp', stateKey: 'waveAmp' },
      { id: 'epsilonSlider', disp: 'valEpsilon', stateKey: 'epsilon' }
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