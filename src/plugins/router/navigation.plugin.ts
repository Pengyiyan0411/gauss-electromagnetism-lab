import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class NavigationPlugin implements BasePlugin<AppState> {
  name = 'app:navigation';
  version = '1.0.0';
  private context!: PluginContext<AppState>;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    // 1. 读取网址参数，告诉后面的学习系统当前是哪个知识点
    const urlParams = new URLSearchParams(window.location.search);
    const currentTopic = urlParams.get('topic') || 'gauss-electric';

    // 同步给微内核状态机
    this.context.state.setState({ activeTopic: currentTopic as any });

    // 2. 渲染带高亮状态的导航栏
    this.renderNavigation(currentTopic);
  }

  private renderNavigation(currentTopic: string) {
    const navHTML = `
      <div id="main-nav-bar" class="absolute top-6 left-1/2 transform -translate-x-1/2 z-[999] flex items-center space-x-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-slate-600/50 pointer-events-auto">
        <button data-topic="gauss-electric" class="nav-btn px-6 py-2.5 rounded-full text-sm font-bold transition-all ${currentTopic === 'gauss-electric' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-blue-600/50'}">高斯电场</button>
        <button data-topic="gauss-magnetic" class="nav-btn px-6 py-2.5 rounded-full text-sm font-bold transition-all ${currentTopic === 'gauss-magnetic' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-blue-600/50'}">高斯磁场</button>
        <button data-topic="faraday" class="nav-btn px-6 py-2.5 rounded-full text-sm font-bold transition-all ${currentTopic === 'faraday' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-purple-600/50'}">法拉第感应</button>
        <button data-topic="poynting" class="nav-btn px-6 py-2.5 rounded-full text-sm font-bold transition-all ${currentTopic === 'poynting' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-emerald-600/50'}">坡印廷定理</button>
        <div class="w-px h-6 bg-slate-600/50 mx-2"></div>
        <button id="btn-global-reset" class="px-4 py-2.5 rounded-full text-sm font-bold text-red-400 hover:text-white hover:bg-red-500 transition-all flex items-center" title="恢复默认参数">
           <span class="mr-1">🔄</span> 重置
        </button>
      </div>
    `;

    if (!document.getElementById('main-nav-bar')) {
        document.body.insertAdjacentHTML('afterbegin', navHTML);
    }

    // 🌟 核心：物理级硬路由！安全、快速、绝不黑屏！
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const topic = target.getAttribute('data-topic');
        if (topic && topic !== currentTopic) {
            // 直接重定向网址，利用 Vite 的极速重载，完美隔离 WebGL 上下文！
            window.location.href = `/?topic=${topic}`;
        }
      });
    });

    // 绑定重置按钮 (逻辑保持不变)
    document.getElementById('btn-global-reset')?.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const originalHTML = target.innerHTML;

        this.context.state.setState({
            radius: 6.0, x: 0, y: 0, z: 0,
            magnetStrength: 5.0,
            coilArea: 16, coilOmega: 1.0,
            waveFreq: 1.0, waveAmp: 3.0, epsilon: 1.0
        } as Partial<AppState>);

        this.context.events.emit('app:global-reset', {});

        target.innerHTML = `<span class="mr-1">✅</span> 成功`;
        target.classList.add('bg-green-500', 'text-white');
        setTimeout(() => {
            target.innerHTML = originalHTML;
            target.classList.remove('bg-green-500', 'text-white');
        }, 1000);
    });
  }

  deactivate() { document.getElementById('main-nav-bar')?.remove(); }
  uninstall() {}
}