import * as THREE from 'three';
import { PluginContext } from '../../../core/plugin-manager';

export class SpatialUI {
  private mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private context: PluginContext<any>;

  constructor(context: PluginContext<any>, position: THREE.Vector3) {
    this.context = context;

    // 创建高分辨率离屏 Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(4, 2);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);

    // 监听内核状态，实时重绘 3D 面板数据
    this.context.state.watch(() => this.drawPanel());
    this.drawPanel(); // 初始化绘制
  }

  private drawPanel() {
    const state = this.context.state.state;
    const { ctx, canvas } = this;

    // 绘制半透明黑色圆角背景
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // Tailwind slate-900
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 30);
    ctx.fill();

    // 绘制动态文本
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('⚡ 沉浸式电磁学实验室', 50, 100);

    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.font = '50px monospace';

    // 根据当前模式显示不同数据
    if (state.activeTopic === 'gauss-electric') {
      ctx.fillText(`高斯球半径: ${state.radius?.toFixed(2)} m`, 50, 220);
      ctx.fillText(`位置: (${state.x?.toFixed(1)}, ${state.y?.toFixed(1)}, ${state.z?.toFixed(1)})`, 50, 300);
      ctx.fillStyle = '#eab308';
      ctx.fillText(`总电通量 Φe = Q / ε₀`, 50, 420);
    }
    // 其他知识点逻辑略...

    this.texture.needsUpdate = true; // 触发 WebGL 纹理上传
  }

  public getMesh() {
    return this.mesh;
  }
}
