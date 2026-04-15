import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { WebGPUEngine } from './core/WebGPUEngine';
import computeShader from './shaders/field-compute.wgsl?raw';
import renderShader from './shaders/field-render.wgsl?raw';

export class WebGPUScenePlugin implements BasePlugin<AppState> {
  name = 'webgpu:scene';
  version = '1.0.0';
  private context!: PluginContext<AppState>;

  private webgpuCanvas!: HTMLCanvasElement;
  private engine!: WebGPUEngine;
  private animationId = 0;

  install(context: PluginContext<AppState>) { this.context = context; }

  async activate() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. 创建用于 WebGPU 渲染的画布 (绝对定位，叠加在 Three.js 画布底层)
    this.webgpuCanvas = document.createElement('canvas');
    this.webgpuCanvas.className = 'absolute inset-0 w-full h-full pointer-events-none z-0';
    this.webgpuCanvas.dataset.pluginOwner = this.name;
    container.insertBefore(this.webgpuCanvas, container.firstChild); // 插入最底层

    // 提升 Three.js Canvas 层级，并设为背景透明
    const threeCanvas = container.querySelector('canvas:not([data-plugin-owner])') as HTMLElement;
    if (threeCanvas) {
      threeCanvas.style.zIndex = '10';
      threeCanvas.style.background = 'transparent';
    }

    this.engine = new WebGPUEngine();
    const supported = await this.engine.init(this.webgpuCanvas);

    // 2. 检测优雅降级
    if (!supported) {
      this.context.state.setState({ webgpuSupported: false, renderEngine: 'cpu' } as any);
      // 触发事件通知原有 Three.js 插件继续绘制箭头
      this.context.events.emit('webgpu:fallback');
      return;
    }

    this.context.state.setState({ webgpuSupported: true, renderEngine: 'webgpu' } as any);
    // 通知 Three.js 隐藏 CPU 渲染的箭头，仅保留高斯球等交互实体
    this.context.events.emit('webgpu:takeover');

    this.engine.createPipelines(computeShader, renderShader);
    this.onWindowResize();
    window.addEventListener('resize', this.onWindowResize);

    this.animate();
  }

  private onWindowResize = () => {
    const container = document.getElementById('canvas-container');
    if (container && this.webgpuCanvas) {
      this.webgpuCanvas.width = container.clientWidth * window.devicePixelRatio;
      this.webgpuCanvas.height = container.clientHeight * window.devicePixelRatio;
    }
  };

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.context.state.state.renderEngine !== 'webgpu') return;

    // 劫持 Three.js 的相机投影矩阵
    const cameraProjMatrix = (window as any).__THREE_CAMERA_MATRIX__; // 通过事件或全局共享获取

    // 执行 WebGPU 渲染 (假设渲染100万个点)
    const pointsCount = this.context.state.state.vectorDensity || 100000;
    this.engine.render(pointsCount, cameraProjMatrix);
  }

  deactivate() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
  }

  uninstall() {
    this.engine?.destroy();
    if (this.webgpuCanvas?.parentNode) {
      this.webgpuCanvas.parentNode.removeChild(this.webgpuCanvas);
    }
    // 通知恢复 CPU 渲染
    this.context.events.emit('webgpu:fallback');
  }
}
