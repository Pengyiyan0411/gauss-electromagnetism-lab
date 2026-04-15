export interface AppState {
  // --- 共享/全局状态 ---
  activeTopic: 'gauss-electric' | 'gauss-magnetic' | 'faraday' | 'poynting';

  // --- 高斯电场 / 磁场 共享 ---
  radius: number;
  x: number;
  y: number;
  z: number;

  // --- 高斯磁场 专有 ---
  magnetStrength: number;

  // --- 法拉第电磁感应 专有 ---
  magnetZ: number;       // 磁铁位置
  magnetVelocity: number;// 磁铁移动速度
  coilTurns: number;     // 线圈匝数
  coilArea: number;      // 线圈面积
  coilOmega: number;     // 线圈旋转角速度

  // --- 坡印廷定理 专有 ---
  waveFreq: number;      // 电磁波频率
  waveAmp: number;       // 振幅
  epsilon: number;       // 相对介电常数

  // --- WebGPU 加速层专有状态 ---
  renderEngine: 'cpu' | 'webgpu';    // 当前激活的渲染引擎
  webgpuSupported: boolean;          // 硬件是否支持

  vectorDensity: number;             // 采样点密度 (例如: 10000 -> 1000000)
  renderMode: 'arrows' | 'lines' | 'heatmap'; // 多渲染模式
  arrowScale: number;                // 矢量大小
  colormap: string;                  // 热力图颜色映射
}
export interface Charge {
  pos: { x: number, y: number, z: number };
  q: number;
  label: string;
}
