import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { STATIC_CHARGES } from '../shared/constants';

export class GaussDataPlugin implements BasePlugin<AppState> {
  name = 'gauss:electric:data';
  version = '1.0.0';
  private context!: PluginContext<AppState>;

  private detailsPanel: HTMLElement | null = null;
  private dataQNet: HTMLElement | null = null;
  private dataFlux: HTMLElement | null = null;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    // 强行把所有转圈的文字和 SVG 隐藏
    document.querySelectorAll('svg.animate-spin').forEach(el => {
        if (el.parentElement) el.parentElement.style.display = 'none';
    });

    const rightPanel = document.querySelector('.glass-scrollbar') || document.querySelector('.w-full.md\\:w-2\\/5.p-8');

    let physWrapper = document.getElementById('gauss-phys-wrapper');
    if (!physWrapper) {
        physWrapper = document.createElement('div');
        physWrapper.id = 'gauss-phys-wrapper';
        if (rightPanel) {
            rightPanel.insertBefore(physWrapper, rightPanel.firstChild);
        } else {
            physWrapper.className = 'absolute right-8 top-24 w-[400px] z-40 bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl';
            document.body.appendChild(physWrapper);
        }
    }

    physWrapper.style.display = 'block';
    physWrapper.innerHTML = `
      <h1 class="text-3xl font-extrabold text-gray-800 mb-6">高斯定律 (3D 静电场)</h1>
      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-lg">
          <p class="text-sm text-gray-700 leading-relaxed mb-2">穿过任意闭合曲面的净电通量，仅由该曲面内部包围的净电荷决定。</p>
      </div>
      <div class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm text-center overflow-x-auto">
          <div class="text-xl my-2">$$\\Phi_E = \\oint_S \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{\\text{内}}}{\\varepsilon_0}$$</div>
      </div>
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
          <h3 class="text-sm font-bold text-gray-800 mb-4">实时通量计算</h3>
          <div class="mb-4">
              <p class="text-xs text-gray-500 mb-1">包围的电荷：</p>
              <div id="enclosed-details" class="text-sm font-mono text-gray-700 min-h-[2rem]">计算中...</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded-lg border border-gray-50 shadow-sm">
                  <p class="text-xs text-gray-500">净电荷 (Q_内)</p>
                  <p id="data-q-net" class="text-xl font-mono text-gray-800">0 q</p>
              </div>
              <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-inner">
                  <p class="text-xs text-emerald-600 font-semibold">总电通量 (Φ_E)</p>
                  <p id="data-flux" class="text-xl font-mono font-bold text-emerald-600">0.00</p>
              </div>
          </div>
      </div>
    `;

    // 🌟 终极安全排雷：不仅检查 MathJax 是否存在，还要确保它真的已经加载完毕变成了一个函数！
    if ((window as any).MathJax && typeof (window as any).MathJax.typesetPromise === 'function') {
        (window as any).MathJax.typesetPromise().catch((err: any) => console.warn("公式渲染被跳过", err));
    }

    this.detailsPanel = document.getElementById('enclosed-details');
    this.dataQNet = document.getElementById('data-q-net');
    this.dataFlux = document.getElementById('data-flux');
    this.context.state.watch(() => this.calculateAndUpdate());
    this.calculateAndUpdate();
  }

  private calculateAndUpdate() {
    if (!this.detailsPanel || !this.dataQNet || !this.dataFlux) return;
    const { radius, x, y, z } = this.context.state.state;
    let netCharge = 0;
    let detailsHtml = '';

    STATIC_CHARGES.forEach(c => {
      let dx = c.pos.x - x; let dy = c.pos.y - y; let dz = c.pos.z - z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) <= radius) {
        netCharge += c.q;
        detailsHtml += `<span class="inline-block bg-white px-2 py-1 rounded shadow-sm mr-2 mb-2 ${c.q > 0 ? 'text-red-500' : 'text-blue-500'} border border-gray-100">${c.label}</span>`;
      }
    });

    if (detailsHtml === '') detailsHtml = '<span class="text-gray-400 italic">高斯球内无净电荷</span>';
    this.detailsPanel.innerHTML = detailsHtml;
    this.dataQNet.textContent = `${netCharge > 0 ? '+' : ''}${netCharge} q`;
    let fluxValue = netCharge * 12.5;
    this.dataFlux.textContent = `${fluxValue > 0 ? '+' : ''}${fluxValue.toFixed(2)} / ε₀`;
    this.dataFlux.className = `text-xl font-mono font-bold ${netCharge > 0 ? 'text-red-600' : (netCharge < 0 ? 'text-blue-600' : 'text-gray-500')}`;
  }

  deactivate() {
     const physWrapper = document.getElementById('gauss-phys-wrapper');
     if (physWrapper) physWrapper.style.display = 'none';
  }
  uninstall() {}
}