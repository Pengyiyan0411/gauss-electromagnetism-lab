import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

if ((window as any).__POYNTING_ANIM_ID__) cancelAnimationFrame((window as any).__POYNTING_ANIM_ID__);

export class PoyntingScenePlugin implements BasePlugin<AppState> {
  name = 'poynting:scene';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private container!: HTMLElement | null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private eArrows: THREE.ArrowHelper[] = [];
  private bArrows: THREE.ArrowHelper[] = [];
  private sArrows: THREE.ArrowHelper[] = [];
  private time: number = 0;

  private animationId: number = 0;
  private isAnimating: boolean = false;
  private boundResize!: () => void;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    this.container = document.getElementById('canvas-container');
    if (!this.container) return;

    if (!this.renderer) {
        this.initThree();
        this.boundResize = this.onWindowResize.bind(this);
    } else if (!this.container.contains(this.renderer.domElement)) {
        this.container.appendChild(this.renderer.domElement);
    }

    this.renderer.domElement.style.display = 'block';
    window.addEventListener('resize', this.boundResize);
    this.onWindowResize();

    if (!this.isAnimating) {
        this.isAnimating = true;
        this.animate();
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    const w = this.container!.clientWidth || window.innerWidth * 0.6;
    const h = this.container!.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.set(20, 15, 25);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.GridHelper(40, 40, 0x334155, 0x1e293b));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // 🌟 初始化电磁波传播路径上的向量阵列
    for (let x = -15; x <= 15; x += 1.5) {
        // 电场 E (红色，沿 Y 轴)
        const eArr = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, 0, 0), 1, 0xef4444, 0.4, 0.2);
        // 磁场 B (蓝色，沿 Z 轴)
        const bArr = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, 0, 0), 1, 0x3b82f6, 0.4, 0.2);
        // 坡印廷矢量 S (绿色，沿 X 轴)
        const sArr = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, 0, 0), 1, 0x10b981, 0.4, 0.2);

        this.scene.add(eArr, bArr, sArr);
        this.eArrows.push(eArr);
        this.bArrows.push(bArr);
        this.sArrows.push(sArr);
    }
  }

  private onWindowResize() {
    if(!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = () => {
    if (!this.isAnimating) return;
    this.animationId = requestAnimationFrame(this.animate);
    (window as any).__POYNTING_ANIM_ID__ = this.animationId;

    // 🌟 恢复电磁波的动态物理方程
    let freq = Number(this.context.state.state.waveFreq) || 1.0;
    let amp = Number(this.context.state.state.waveAmp) || 3.0;
    let epsilon = Number(this.context.state.state.epsilon) || 1.0;

    this.time += 0.05 * freq;
    const k = 0.5; // 波数

    for (let i = 0; i < this.eArrows.length; i++) {
        let x = -15 + i * 1.5;
        let phase = k * x - this.time;

        let eMag = amp * Math.cos(phase);
        let bMag = (amp / epsilon) * Math.cos(phase);
        let sMag = eMag * bMag * 0.3; // S = E x B，缩放用于视觉展示

        // 更新电场 E
        if (Math.abs(eMag) > 0.1) {
            this.eArrows[i].visible = true;
            this.eArrows[i].setDirection(new THREE.Vector3(0, eMag > 0 ? 1 : -1, 0));
            this.eArrows[i].setLength(Math.abs(eMag), 0.4, 0.2);
        } else this.eArrows[i].visible = false;

        // 更新磁场 B
        if (Math.abs(bMag) > 0.1) {
            this.bArrows[i].visible = true;
            this.bArrows[i].setDirection(new THREE.Vector3(0, 0, bMag > 0 ? 1 : -1));
            this.bArrows[i].setLength(Math.abs(bMag), 0.4, 0.2);
        } else this.bArrows[i].visible = false;

        // 更新坡印廷矢量 S
        if (Math.abs(sMag) > 0.1) {
            this.sArrows[i].visible = true;
            // 能量总是沿着波的传播方向（+x）流动
            this.sArrows[i].setDirection(new THREE.Vector3(1, 0, 0));
            this.sArrows[i].setLength(Math.abs(sMag), 0.5, 0.3);
        } else this.sArrows[i].visible = false;
    }

    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  }

  deactivate() {
    window.removeEventListener('resize', this.boundResize);
    this.isAnimating = false;
    cancelAnimationFrame(this.animationId);
  }
  uninstall() {}
}