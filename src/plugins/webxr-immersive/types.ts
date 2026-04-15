// 在已有的 AppState 基础上逻辑扩展
export interface XRStateExtension {
  xrMode: 'none' | 'vr' | 'ar';
  xrSupported: { vr: boolean; ar: boolean };
}

// 射线抓取目标枚举
export enum InteractableType {
  GAUSSIAN_SPHERE = 'GAUSSIAN_SPHERE',
  MAGNET = 'MAGNET',
  COIL = 'COIL'
}
