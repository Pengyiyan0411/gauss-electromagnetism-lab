import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class GaussMagneticDataPlugin implements BasePlugin<AppState> {
  name = 'gauss:magnetic:data';
  version = '1.0.0';
  private context!: PluginContext<AppState>;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    document.querySelectorAll('svg.animate-spin').forEach(el => {
        if (el.parentElement) el.parentElement.style.display = 'none';
    });

    const rightPanel = document.querySelector('.glass-scrollbar') || document.querySelector('.w-full.md\\:w-2\\/5.p-8') || document.body;
    let physWrapper = document.getElementById('mag-phys-wrapper');
    if (!physWrapper) {
        physWrapper = document.createElement('div');
        physWrapper.id = 'mag-phys-wrapper';
        if (rightPanel !== document.body) rightPanel.insertBefore(physWrapper, rightPanel.firstChild);
        else document.body.appendChild(physWrapper);
    }

    physWrapper.style.display = 'block';
    physWrapper.innerHTML = `
      <h1 class="text-3xl font-extrabold text-gray-800 mb-6">高斯定律 (3D 磁场)</h1>
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <p class="text-sm text-gray-700 leading-relaxed mb-2">高斯磁场定律指出，穿过任意闭合曲面的净磁通量恒等于零（磁单极子不存在）。</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm text-center">
          <div class="text-xl my-2">$$\\oint_S \\mathbf{B} \\cdot d\\mathbf{A} = 0$$</div>
      </div>
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
          <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded-lg shadow-sm">
                  <p class="text-xs text-gray-500">净磁荷 (不存在)</p>
                  <p class="text-xl font-mono font-bold text-gray-400">0 q_m</p>
              </div>
              <div class="bg-blue-50 p-3 rounded-lg shadow-inner border border-blue-100">
                  <p class="text-xs text-blue-600 font-semibold">净磁通量 (Φ_B)</p>
                  <p id="mag-data-flux" class="text-2xl font-mono font-bold text-blue-600">0.00 Wb</p>
              </div>
          </div>
      </div>
    `;

    if ((window as any).MathJax && typeof (window as any).MathJax.typesetPromise === 'function') {
        (window as any).MathJax.typesetPromise().catch(() => {});
    }
  }

  deactivate() {
      const w = document.getElementById('mag-phys-wrapper');
      if (w) w.style.display = 'none';
  }
  uninstall() {}
}