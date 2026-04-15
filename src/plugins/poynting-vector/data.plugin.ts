import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class PoyntingDataPlugin implements BasePlugin<AppState> {
  name = 'poynting:data';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private timer: number = 0;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    document.querySelectorAll('svg.animate-spin').forEach(el => {
        if (el.parentElement) el.parentElement.style.display = 'none';
    });

    const rightPanel = document.querySelector('.glass-scrollbar') || document.querySelector('.w-full.md\\:w-2\\/5.p-8') || document.body;
    let physWrapper = document.getElementById('poynting-phys-wrapper');
    if (!physWrapper) {
        physWrapper = document.createElement('div');
        physWrapper.id = 'poynting-phys-wrapper';
        if (rightPanel !== document.body) rightPanel.insertBefore(physWrapper, rightPanel.firstChild);
        else document.body.appendChild(physWrapper);
    }

    physWrapper.style.display = 'block';
    physWrapper.innerHTML = `
      <h1 class="text-3xl font-extrabold text-gray-800 mb-6">坡印廷定理 (能流密度)</h1>
      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-lg">
          <p class="text-sm text-gray-700 leading-relaxed mb-2">坡印廷矢量 S 直观地展示了电磁波的传播方向与能量流动。</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm text-center">
          <div class="text-xl my-2">$$\\mathbf{S} = \\frac{1}{\\mu_0} \\mathbf{E} \\times \\mathbf{B}$$</div>
      </div>
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
          <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded-lg shadow-sm">
                  <p class="text-xs text-gray-500">介质波速 (v)</p>
                  <p id="poynting-vel" class="text-lg font-mono text-gray-800">1.00 c</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg shadow-inner border border-emerald-100">
                  <p class="text-xs text-emerald-600 font-semibold">平均能流密度 &lt;S&gt;</p>
                  <p id="poynting-s" class="text-xl font-mono font-bold text-emerald-600">0.00 W/m²</p>
              </div>
          </div>
      </div>
    `;

    if ((window as any).MathJax && typeof (window as any).MathJax.typesetPromise === 'function') {
        (window as any).MathJax.typesetPromise().catch(() => {});
    }

    this.timer = window.setInterval(() => {
        const { waveAmp, epsilon } = this.context.state.state;
        const E0 = waveAmp || 3.0;
        const eps = epsilon || 1.0;
        const v = 1.0 / Math.sqrt(eps);
        const sAvg = 0.5 * eps * v * E0 * E0;

        const elVel = document.getElementById('poynting-vel');
        const elS = document.getElementById('poynting-s');
        if (elVel) elVel.textContent = v.toFixed(2) + ' c';
        if (elS) elS.textContent = sAvg.toFixed(2) + ' W/m²';
    }, 100);
  }

  deactivate() {
      clearInterval(this.timer);
      const w = document.getElementById('poynting-phys-wrapper');
      if (w) w.style.display = 'none';
  }
  uninstall() {}
}