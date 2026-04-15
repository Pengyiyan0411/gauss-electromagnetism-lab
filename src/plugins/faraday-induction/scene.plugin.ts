import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

if ((window as any).__FARADAY_ANIM_ID__) cancelAnimationFrame((window as any).__FARADAY_ANIM_ID__);

export class FaradayScenePlugin implements BasePlugin<AppState> {
  name = 'faraday:scene';
  version = '1.0.0';
  private context!: PluginContext<AppState>;
  private container!: HTMLElement | null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private coil!: THREE.Group;
  private emfArrow!: THREE.ArrowHelper;
  private bFieldArrows: THREE.ArrowHelper[] = [];

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

    // 🌟 绘制精美的铜制线圈
    this.coil = new THREE.Group();
    const coilGeo = new THREE.TorusGeometry(4, 0.3, 16, 100);
    const coilMat = new THREE.MeshPhongMaterial({ color: 0xb45309, shininess: 150 });
    const coilMesh = new THREE.Mesh(coilGeo, coilMat);
    this.coil.add(coilMesh);

    // 绘制感生电动势（电流）方向指示器
    this.emfArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(4, 0, 0), 3, 0xfde047, 0.8, 0.4);
    this.coil.add(this.emfArrow);
    this.scene.add(this.coil);

    // 🌟 绘制匀强磁场阵列 (穿过线圈的蓝色箭头)
    const bDir = new THREE.Vector3(0, 0, -1);
    for (let x = -8; x <= 8; x += 4) {
        for (let y = -8; y <= 8; y += 4) {
            const arr = new THREE.ArrowHelper(bDir, new THREE.Vector3(x, y, 5), 10, 0x3b82f6, 1, 0.5);
            this.scene.add(arr);
            this.bFieldArrows.push(arr);
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
    (window as any).__FARADAY_ANIM_ID__ = this.animationId;

    // 🌟 恢复物理动画与滑块的联动
    let area = Number(this.context.state.state.coilArea) || 16.0;
    let omega = Number(this.context.state.state.coilOmega) || 1.0;

    // 动态缩放线圈大小
    let radiusScale = Math.sqrt(area / 16.0);
    this.coil.scale.set(radiusScale, radiusScale, radiusScale);

    // 动态旋转线圈
    this.coil.rotation.y += omega * 0.05;

    // 动态计算并显示感生电动势 E = -d(Φ)/dt (用箭头长度和方向表示)
    let theta = this.coil.rotation.y;
    let emf = area * omega * Math.sin(theta); // 简化版的法拉第定律视觉公式

    if (Math.abs(emf) > 0.1) {
        this.emfArrow.visible = true;
        this.emfArrow.setLength(Math.abs(emf) * 0.3, 0.5, 0.3);
        // 根据正负改变箭头方向 (顺时针/逆时针)
        this.emfArrow.setDirection(new THREE.Vector3(0, emf > 0 ? 1 : -1, 0));
    } else {
        this.emfArrow.visible = false;
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