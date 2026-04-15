import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { SAMPLE_POINTS } from '../shared/constants';

if ((window as any).__MAG_ANIM_ID__) cancelAnimationFrame((window as any).__MAG_ANIM_ID__);

export class GaussMagneticScenePlugin implements BasePlugin<AppState> {
  name = 'gauss:magnetic:scene';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private container!: HTMLElement | null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private gaussianSphere!: THREE.Mesh;
  private arrows: { bArrow: THREE.ArrowHelper, daArrow: THREE.ArrowHelper }[] = [];
  private magnetGroup!: THREE.Group;
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
        // 重新接上滑块状态监听
        this.context.state.watch((prop) => {
          if (['radius', 'x', 'y', 'magnetStrength'].includes(prop)) this.updatePhysics();
        });
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
    this.updatePhysics(); // 立即渲染一次物理状态
  }

  private initThree() {
    this.scene = new THREE.Scene();
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // 🌟 绘制精美的条形磁铁
    this.magnetGroup = new THREE.Group();
    const nGeo = new THREE.BoxGeometry(3, 1.5, 1.5);
    const nMat = new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 100 }); // 红 N 极
    const nMesh = new THREE.Mesh(nGeo, nMat);
    nMesh.position.x = 1.5;

    const sGeo = new THREE.BoxGeometry(3, 1.5, 1.5);
    const sMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 100 }); // 蓝 S 极
    const sMesh = new THREE.Mesh(sGeo, sMat);
    sMesh.position.x = -1.5;

    this.magnetGroup.add(nMesh);
    this.magnetGroup.add(sMesh);
    this.scene.add(this.magnetGroup);

    // 绘制高斯球面
    this.gaussianSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2, wireframe: true })
    );
    this.scene.add(this.gaussianSphere);

    // 初始化采样点箭头
    this.arrows = [];
    for (let i = 0; i < SAMPLE_POINTS; i++) {
      const daArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(), 1, 0x10b981, 0.4, 0.2);
      const bArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(), 1, 0x0ea5e9, 0.4, 0.2); // 蓝色磁场线
      this.scene.add(daArrow, bArrow);
      this.arrows.push({ daArrow, bArrow });
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

  // 🌟 恢复真实的磁偶极子场计算
  private updatePhysics() {
    if (!this.arrows || this.arrows.length === 0) return;

    let r = Number(this.context.state.state.radius) || 6.0;
    let cx = Number(this.context.state.state.x) || 0;
    let cy = Number(this.context.state.state.y) || 0;
    let strength = Number(this.context.state.state.magnetStrength) || 5.0;
    if (r <= 0.1) r = 0.1;

    const center = new THREE.Vector3(cx, cy, 0);
    this.gaussianSphere.position.copy(center);
    this.gaussianSphere.scale.set(r, r, r);

    const points = this.getFibonacciSpherePoints(SAMPLE_POINTS, r, center);
    const m = new THREE.Vector3(strength * 2, 0, 0); // 磁矩向量

    for (let i = 0; i < SAMPLE_POINTS; i++) {
      let p = points[i];
      let { daArrow, bArrow } = this.arrows[i];

      // 面法向量
      let daDir = new THREE.Vector3().subVectors(p, center).normalize();
      daArrow.position.copy(p);
      daArrow.setDirection(daDir);
      daArrow.setLength(r * 0.3);

      // 计算磁偶极子场 B = (μ0/4π) * [3r(m·r)/r^5 - m/r^3]
      let rVec = new THREE.Vector3().copy(p);
      let rDist = rVec.length();
      let B = new THREE.Vector3(0,0,0);

      if (rDist > 1.5) {
          let mDotR = m.dot(rVec);
          let term1 = rVec.clone().multiplyScalar(3 * mDotR / Math.pow(rDist, 5));
          let term2 = m.clone().divideScalar(Math.pow(rDist, 3));
          B.subVectors(term1, term2).multiplyScalar(20); // 放大系数用于视觉展示
      }

      let bMag = B.length();
      if (bMag > 0.05) {
        bArrow.position.copy(p);
        bArrow.setDirection(B.normalize());
        bArrow.setLength(Math.min(bMag, 5.0), 0.5, 0.2);
        bArrow.visible = true;
      } else {
        bArrow.visible = false;
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
    (window as any).__MAG_ANIM_ID__ = this.animationId;
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