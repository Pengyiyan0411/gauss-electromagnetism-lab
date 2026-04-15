import * as THREE from 'three';
import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { VRManager } from './core/VRManager';
import { ARManager } from './core/ARManager';
import { SpatialUI } from './ui/SpatialUI';

export class WebXRImmersivePlugin implements BasePlugin<AppState> {
  name = 'webxr:immersive';
  version = '1.0.0';
  private context!: PluginContext<AppState>;

  private vrManager: VRManager | null = null;
  private arManager: ARManager | null = null;
  private spatialUI: SpatialUI | null = null;

  // 保存对当前活跃的 Three 场景的引用
  private activeRenderer: THREE.WebGLRenderer | null = null;
  private activeScene: THREE.Scene | null = null;

  install(context: PluginContext<AppState>) {
    this.context = context;

    // 监听其他场景插件发出的就绪事件，获取其 renderer 引用
    this.context.events.on('scene:ready', (data: { renderer: THREE.WebGLRenderer, scene: THREE.Scene, rootGroup: THREE.Group }) => {
      this.activeRenderer = data.renderer;
      this.activeScene = data.scene;

      // 开启 XR 渲染管线
      this.activeRenderer.xr.enabled = true;

      // 注入空间 UI
      if (!this.spatialUI) {
        this.spatialUI = new SpatialUI(this.context, new THREE.Vector3(0, 5, -8));
        this.activeScene.add(this.spatialUI.getMesh());
      }

      // 初始化交互引擎
      this.vrManager = new VRManager(this.activeRenderer, this.activeScene, this.context);
      this.vrManager.initControllers();

      this.arManager = new ARManager(this.activeRenderer, this.activeScene, data.rootGroup);

      // 接管渲染循环以注入 AR HitTest
      this.activeRenderer.setAnimationLoop((time, frame) => {
        if (this.context.state.state.xrMode === 'ar') {
           this.arManager?.update(frame, this.activeRenderer!.xr.getReferenceSpace());
        }
        // 通知 WebGPU 或原有插件进行重绘
        this.context.events.emit('xr:render-frame');
        this.activeRenderer!.render(this.activeScene!, this.activeRenderer!.xr.getCamera());
      });
    });
  }

  activate() {
    this.checkXRSupport();
  }

  private async checkXRSupport() {
    if ('xr' in navigator) {
      const vrSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
      const arSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');

      this.context.state.setState({ xrSupported: { vr: vrSupported, ar: arSupported } } as any);
      this.renderXRButtons(vrSupported, arSupported);
    }
  }

  private renderXRButtons(vr: boolean, ar: boolean) {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    if (vr) {
      const btnVR = document.createElement('button');
      btnVR.className = 'absolute bottom-4 left-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg border border-slate-600 z-50';
      btnVR.textContent = '👓 进入 VR 实验室';
      btnVR.onclick = () => this.startSession('immersive-vr');
      container.appendChild(btnVR);
    }

    if (ar) {
      const btnAR = document.createElement('button');
      btnAR.className = 'absolute bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg border border-emerald-500 z-50';
      btnAR.textContent = '📱 放置 AR 实景';
      btnAR.onclick = () => this.startSession('immersive-ar');
      container.appendChild(btnAR);
    }
  }

  private async startSession(mode: 'immersive-vr' | 'immersive-ar') {
    if (!this.activeRenderer) return;

    const sessionInit = mode === 'immersive-ar' ? { requiredFeatures: ['hit-test'] } : {};

    try {
      const session = await (navigator as any).xr.requestSession(mode, sessionInit);
      this.activeRenderer.xr.setSession(session);
      this.context.state.setState({ xrMode: mode === 'immersive-vr' ? 'vr' : 'ar' } as any);

      session.addEventListener('end', () => {
        this.context.state.setState({ xrMode: 'none' } as any);
      });
    } catch (e) {
      console.error("XR Session failed:", e);
      alert("无法启动沉浸式会话，已降级为普通 3D 模式");
    }
  }

  deactivate() {}

  uninstall() {
    // 强制关闭会话，释放资源防内存泄漏
    const session = this.activeRenderer?.xr.getSession();
    if (session) session.end();

    this.vrManager?.dispose();
    this.arManager?.dispose();

    if (this.spatialUI && this.activeScene) {
      this.activeScene.remove(this.spatialUI.getMesh());
    }

    if (this.activeRenderer) {
       this.activeRenderer.setAnimationLoop(null); // 停止 WebXR 特有循环
       this.activeRenderer.xr.enabled = false;
    }
  }
}
