import * as THREE from 'three';

export class ARManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private reticle!: THREE.Mesh;
  private hitTestSource: any = null;
  private hitTestSourceRequested = false;
  private sceneRootGroup: THREE.Group; // 包含所有物理模型的根节点

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, rootGroup: THREE.Group) {
    this.renderer = renderer;
    this.scene = scene;
    this.sceneRootGroup = rootGroup;
    this.initReticle();
  }

  private initReticle() {
    // 现实平面瞄准圈
    const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    const controller = this.renderer.xr.getController(0);
    controller.addEventListener('select', () => {
      if (this.reticle.visible) {
        // 【核心】将虚拟实验室的原点放置在现实平面的光标处，并缩放至桌面级别 (10%)
        this.sceneRootGroup.position.setFromMatrixPosition(this.reticle.matrix);
        this.sceneRootGroup.scale.set(0.1, 0.1, 0.1);
      }
    });
    this.scene.add(controller);
  }

  public update(frame: any, referenceSpace: any) {
    if (!frame) return;

    const session = this.renderer.xr.getSession();
    if (session && !this.hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((refSpace: any) => {
        session.requestHitTestSource({ space: refSpace }).then((source: any) => {
          this.hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
      });
      this.hitTestSourceRequested = true;
    }

    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        this.reticle.visible = false;
      }
    }
  }

  public dispose() {
    this.scene.remove(this.reticle);
  }
}
