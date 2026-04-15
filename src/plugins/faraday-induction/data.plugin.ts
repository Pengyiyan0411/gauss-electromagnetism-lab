import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class FaradayDataPlugin implements BasePlugin<AppState> {
  name = 'faraday:data';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private timer: number = 0;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    // 🌟 终极防转圈死锁刺客
    document.querySelectorAll('svg.animate-spin').forEach(el => {
        if (el.parentElement) el.parentElement.style.display = 'none';
    });

    const rightPanel = document.querySelector('.glass-scrollbar') || document.querySelector('.w-full.md\\:w-2\\/5.p-8') || document.body;
    let physWrapper = document.getElementById('faraday-phys-wrapper');
    if (!physWrapper) {
        physWrapper = document.createElement('div');
        physWrapper.id = 'faraday-phys-wrapper';
        if (rightPanel !== document.body) rightPanel.insertBefore(physWrapper, rightPanel.firstChild);
        else document.body.appendChild(physWrapper);
    }

    physWrapper.style.display = 'block';
    physWrapper.innerHTML = `
      <h1 class="text-3xl font-extrabold text-gray-800 mb-6">法拉第电磁感应定律</h1>
      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
          <p class="text-sm text-gray-700 leading-relaxed mb-2">闭合回路中产生的感生电动势，与穿过该回路的磁通量的时间变化率成正比。</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm text-center">
          <div class="text-xl my-2">$$\\mathcal{E} = - \\frac{d\\Phi_B}{dt}$$</div>
      </div>
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
          <h3 class="text-sm font-bold text-gray-800 mb-4">实时感应数据</h3>
          <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-50">
                  <p class="text-xs text-gray-500">磁通量 (Φ_B)</p>
                  <p id="faraday-flux" class="text-lg font-mono text-gray-800">计算中...</p>
              </div>
              <div class="bg-purple-50 p-3 rounded-lg shadow-inner border border-purple-100">
                  <p class="text-xs text-purple-600 font-semibold">感生电动势 (ε)</p>
                  <p id="faraday-emf" class="text-xl font-mono font-bold text-purple-600">0.00 V</p>
              </div>
          </div>
      </div>
    `;

    if ((window as any).MathJax && typeof (window as any).MathJax.typesetPromise === 'function') {
        (window as any).MathJax.typesetPromise().catch(() => {});
    }

    let time = 0;
    this.timer = window.setInterval(() => {
        time += 0.05;
        const { coilArea, coilOmega } = this.context.state.state;
        const A = coilArea || 16;
        const w = coilOmega || 1.0;
        const flux = A * Math.cos(w * time);
        const emf = A * w * Math.sin(w * time); // 导数

        const fluxEl = document.getElementById('faraday-flux');
        const emfEl = document.getElementById('faraday-emf');
        if (fluxEl) fluxEl.textContent = flux.toFixed(2) + ' Wb';
        if (emfEl) emfEl.textContent = emf.toFixed(2) + ' V';
    }, 50);
  }

  deactivate() {
      clearInterval(this.timer);
      const w = document.getElementById('faraday-phys-wrapper');
      if (w) w.style.display = 'none';
  }
  uninstall() {}
}