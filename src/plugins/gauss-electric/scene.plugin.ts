import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { STATIC_CHARGES, SAMPLE_POINTS } from '../shared/constants';

// 🌟 幽灵线程刺客：Vite 热更新时，立刻秒杀上一个版本的 3D 动画循环，防止黑屏卡死！
if ((window as any).__GAUSS_ANIM_ID__) {
    cancelAnimationFrame((window as any).__GAUSS_ANIM_ID__);
}

export class GaussScenePlugin implements BasePlugin<AppState> {
  name = 'gauss:electric:scene';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private container!: HTMLElement | null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private gaussianSphere!: THREE.Mesh;
  private arrows: { eArrow: THREE.ArrowHelper, daArrow: THREE.ArrowHelper }[] = [];
  private animationId: number = 0;
  private isAnimating: boolean = false;
  private boundResize!: () => void;

  install(context: PluginContext<AppState>) { this.context = context; }

  activate() {
    this.container = document.getElementById('canvas-container');
    if (!this.container) return;

    if (!this.renderer) {
        // 第一次初始化
        this.initThree();
        this.boundResize = this.onWindowResize.bind(this);
        this.context.state.watch((prop) => {
          if (['radius', 'x', 'y', 'z'].includes(prop)) this.updatePhysics();
        });
    } else {
        // 🌟 自动寻回机制：如果 Vite 热更新把 DOM 刷没了，强行把画布重新塞进去！
        if (!this.container.contains(this.renderer.domElement)) {
            this.container.innerHTML = ''; // 清除残留垃圾
            this.container.appendChild(this.renderer.domElement);
        }
    }

    // 暴力显示，绝不隐藏
    this.renderer.domElement.style.display = 'block';
    window.addEventListener('resize', this.boundResize);

    // 强制矫正尺寸，延迟 100ms 再矫正一次，防止 CSS 还没加载完
    this.onWindowResize();
    setTimeout(() => this.onWindowResize(), 100);

    if (!this.isAnimating) {
        this.isAnimating = true;
        this.animate();
    }
    this.updatePhysics();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    // 强制设置背景底色，防止 alpha 导致全黑
    this.scene.background = new THREE.Color(0x0f172a);

    const w = this.container!.clientWidth || window.innerWidth * 0.6;
    const h = this.container!.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.set(15, 15, 25);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.GridHelper(30, 30, 0x334155, 0x1e293b));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const chargeGeo = new THREE.SphereGeometry(0.8, 32, 32);
    STATIC_CHARGES.forEach(c => {
      const isPos = c.q > 0;
      const mat = new THREE.MeshPhongMaterial({
        color: isPos ? 0xef4444 : 0x3b82f6, emissive: isPos ? 0x450000 : 0x000045, shininess: 100
      });
      const mesh = new THREE.Mesh(chargeGeo, mat);
      mesh.position.set(c.pos.x, c.pos.y, c.pos.z);
      this.scene.add(mesh);

      try {
          const canvas = document.createElement('canvas');
          canvas.width = 256; canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = isPos ? '#fca5a5' : '#93c5fd';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${isPos ? '+' : ''}${c.q} q`, 128, 64);

          const spriteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
          sprite.scale.set(3, 1.5, 1);
          sprite.renderOrder = 999;
          this.scene.add(sprite);
      } catch (e) {}
    });

    this.gaussianSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.15, wireframe: true })
    );
    this.scene.add(this.gaussianSphere);

    this.arrows = [];
    for (let i = 0; i < SAMPLE_POINTS; i++) {
      const daArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(), 1, 0x10b981, 0.4, 0.2);
      const eArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(), 1, 0xeab308, 0.4, 0.2);
      this.scene.add(daArrow, eArrow);
      this.arrows.push({ daArrow, eArrow });
    }
  }

  private getFibonacciSpherePoints(samples: number, radius: number, center: THREE.Vector3) {
    let points = [];
    let phi = Math.PI * (3. - Math.sqrt(5.));
    for (let i = 0; i < samples; i++) {
      let y = 1 - (i / (samples - 1)) * 2;
      let r = Math.sqrt(1 - y * y);
      let theta = phi * i;
      points.push(new THREE.Vector3(
        Math.cos(theta) * r * radius + center.x, y * radius + center.y, Math.sin(theta) * r * radius + center.z
      ));
    }
    return points;
  }

  private updatePhysics() {
    if (!this.arrows || this.arrows.length === 0) return;

    // 🌟 数据安全卫士：防止用户拖动滑块时产生 NaN 导致 3D 引擎彻底崩溃黑屏！
    let r = Number(this.context.state.state.radius) || 6.0;
    let cx = Number(this.context.state.state.x) || 0;
    let cy = Number(this.context.state.state.y) || 0;
    let cz = Number(this.context.state.state.z) || 0;
    if (r <= 0.1) r = 0.1; // 防止半径为 0 引发奇点崩溃

    const center = new THREE.Vector3(cx, cy, cz);

    this.gaussianSphere.position.copy(center);
    this.gaussianSphere.scale.set(r, r, r);

    const points = this.getFibonacciSpherePoints(SAMPLE_POINTS, r, center);

    for (let i = 0; i < SAMPLE_POINTS; i++) {
      let p = points[i];
      let { daArrow, eArrow } = this.arrows[i];

      let daDir = new THREE.Vector3().subVectors(p, center).normalize();
      daArrow.position.copy(p);
      daArrow.setDirection(daDir);
      daArrow.setLength(r * 0.3);

      let E = new THREE.Vector3(0, 0, 0);
      STATIC_CHARGES.forEach(c => {
        let rVec = new THREE.Vector3().subVectors(p, new THREE.Vector3(c.pos.x, c.pos.y, c.pos.z));
        let rSq = rVec.lengthSq();
        if (rSq > 0.5) E.add(rVec.normalize().multiplyScalar(50 * c.q / rSq));
      });

      let eMag = E.length();
      if (eMag > 0.1) {
        eArrow.position.copy(p);
        eArrow.setDirection(E.normalize());
        eArrow.setLength(Math.min(eMag, 5.0), 0.5, 0.2);
        eArrow.visible = true;
      } else {
        eArrow.visible = false;
      }
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

    // 注册到全局，供刺客随时暗杀
    (window as any).__GAUSS_ANIM_ID__ = this.animationId;

    this.controls?.update();
    this.renderer?.render(this.scene, this.camera);
  }

  deactivate() {
    window.removeEventListener('resize', this.boundResize);
    this.isAnimating = false;
    cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.domElement.style.display = 'none';
  }
  uninstall() {}
}