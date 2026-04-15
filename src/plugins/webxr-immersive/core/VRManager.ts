import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import { PluginContext } from '../../../core/plugin-manager';
import { AppState } from '../../../types';

export class VRManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private context: PluginContext<AppState>;

  private controllers: THREE.Group[] = [];
  private controllerGrips: THREE.Group[] = [];
  private raycaster = new THREE.Raycaster();
  private tempMatrix = new THREE.Matrix4();

  private intersected: THREE.Object3D | null = null; // 当前射线悬停对象
  private draggedItem: THREE.Object3D | null = null; // 当前抓取对象

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, context: PluginContext<AppState>) {
    this.renderer = renderer;
    this.scene = scene;
    this.context = context;
  }

  public initControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // 初始化左右手柄
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.addEventListener('selectstart', this.onSelectStart);
      controller.addEventListener('selectend', this.onSelectEnd);
      this.scene.add(controller);
      this.controllers.push(controller);

      // 手柄可见模型
      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      this.scene.add(grip);
      this.controllerGrips.push(grip);

      // 绘制射线几何体
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5)
      ]);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      line.name = 'line';
      controller.add(line);
    }
  }

  private onSelectStart = (event: any) => {
    const controller = event.target;
    const intersections = this.getIntersections(controller);

    if (intersections.length > 0) {
      const intersection = intersections[0];
      const object = intersection.object;

      // 检查是否是可交互物体 (需在原插件中标记 userData.interactable = true)
      if (object.userData.interactable) {
        this.draggedItem = object;
        controller.attach(this.draggedItem); // 将物体挂载到手柄上实现抓取
      }
    }
  };

  private onSelectEnd = (event: any) => {
    const controller = event.target;
    if (this.draggedItem) {
      this.scene.attach(this.draggedItem); // 放回原场景

      // 【核心解耦点】: 将抓取后的新位置同步到内核 State
      // 这样原有的普通 3D 插件、WebGPU 插件、Data 插件会自动收到通知并重新计算公式和场分布！
      const pos = this.draggedItem.position;
      this.context.state.setState({ x: pos.x, y: pos.y, z: pos.z } as Partial<AppState>);

      this.draggedItem = null;
    }
  };

  private getIntersections(controller: THREE.Group) {
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    return this.raycaster.intersectObjects(this.scene.children, true);
  }

  public dispose() {
    this.controllers.forEach(c => {
      c.removeEventListener('selectstart', this.onSelectStart);
      c.removeEventListener('selectend', this.onSelectEnd);
      this.scene.remove(c);
    });
    this.controllerGrips.forEach(g => this.scene.remove(g));
  }
}
