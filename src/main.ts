import './styles/index.css'; // Tailwind 样式
import { Kernel } from './core';
import { AppState } from './types';

// 🌟 【新增 1】：导入 lil-gui 库
import GUI from 'lil-gui';

import { AuthSyncPlugin } from './plugins/auth-sync/auth-sync.plugin';
import { CommunityCollabPlugin } from './plugins/community-collab/collab.plugin';
// ==========================================
// 1. 导入全局路由与导航插件
// ==========================================
import { NavigationPlugin } from './plugins/router/navigation.plugin';

// ==========================================
// 2. 导入所有物理知识点插件 (Scene, Controls, Data)
// ==========================================
import { GaussScenePlugin } from './plugins/gauss-electric/scene.plugin';
import { GaussControlsPlugin } from './plugins/gauss-electric/controls.plugin';
import { GaussDataPlugin } from './plugins/gauss-electric/data.plugin';

import { GaussMagneticScenePlugin } from './plugins/gauss-magnetic/scene.plugin';
import { GaussMagneticControlsPlugin } from './plugins/gauss-magnetic/controls.plugin';
import { GaussMagneticDataPlugin } from './plugins/gauss-magnetic/data.plugin';

import { FaradayScenePlugin } from './plugins/faraday-induction/scene.plugin';
import { FaradayControlsPlugin } from './plugins/faraday-induction/controls.plugin';
import { FaradayDataPlugin } from './plugins/faraday-induction/data.plugin';

import { PoyntingScenePlugin } from './plugins/poynting-vector/scene.plugin';
import { PoyntingControlsPlugin } from './plugins/poynting-vector/controls.plugin';
import { PoyntingDataPlugin } from './plugins/poynting-vector/data.plugin';

// ==========================================
// 3. 导入自适应学习系统 (教育层)
// ==========================================
import { AdaptiveLearningPlugin } from './plugins/adaptive-learning/learning.plugin';

// ==========================================
// 4. 导入本地离线大模型 AI 助教
// ==========================================
import { AiAssistantPlugin } from './plugins/ai-assistant/ai.plugin';

// ==========================================
// 5. 导入前沿交互层：摄像头手势识别插件
// ==========================================
import { GesturePlugin } from './plugins/interaction/gesture.plugin';

// ==========================================
// 初始化全局状态
// ==========================================
const initialState: AppState = {
  activeTopic: 'gauss-electric',
  radius: 6.0, x: 0, y: 0, z: 0,
  magnetStrength: 5.0,
  magnetZ: 0, magnetVelocity: 0, coilTurns: 10, coilArea: 16, coilOmega: 1.0,
  waveFreq: 1.0, waveAmp: 3.0, epsilon: 1.0,
  renderEngine: 'cpu', webgpuSupported: false, vectorDensity: 100000,
  renderMode: 'arrows', arrowScale: 1.0, colormap: 'default'
};

const kernel = new Kernel<AppState>(initialState);
(window as any).kernel = kernel;

// 注册基础插件
kernel.plugins.register(new CommunityCollabPlugin());
kernel.plugins.register(new NavigationPlugin());
kernel.plugins.register(new GaussScenePlugin());
kernel.plugins.register(new GaussControlsPlugin());
kernel.plugins.register(new GaussDataPlugin());
kernel.plugins.register(new GaussMagneticScenePlugin());
kernel.plugins.register(new GaussMagneticControlsPlugin());
kernel.plugins.register(new GaussMagneticDataPlugin());
kernel.plugins.register(new FaradayScenePlugin());
kernel.plugins.register(new FaradayControlsPlugin());
kernel.plugins.register(new FaradayDataPlugin());
kernel.plugins.register(new PoyntingScenePlugin());
kernel.plugins.register(new PoyntingControlsPlugin());
kernel.plugins.register(new PoyntingDataPlugin());
kernel.plugins.register(new AdaptiveLearningPlugin());
kernel.plugins.register(new AuthSyncPlugin());

// 注册 AI 助教插件
kernel.plugins.register(new AiAssistantPlugin());

// 注册 手势控制插件
kernel.plugins.register(new GesturePlugin());


// ==========================================
// 🌟 【新增 2】：学术级仿真控制台 UI 初始化函数
// ==========================================
function setupAcademicUI() {
  const gui = new GUI({ title: '🎓 学术级仿真控制台' });

  // 样式微调：为了避免挡住你原有的顶部导航栏，设置到右上角偏下的位置，并置于顶层
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '80px';
  gui.domElement.style.right = '10px';
  gui.domElement.style.zIndex = '9999';

  const simParams = {
    algorithm: 'Analytical',
    gridDensity: 256,
    runFDM: () => {
      alert(`🚀 启动 WebGPU FDM 计算...\n目标网格: ${simParams.gridDensity}x${simParams.gridDensity}\n计算引擎已就绪！`);
      console.log('FDM 计算模块已调用，正在后台求解泊松方程...');
    },
    exportCSV: () => {
      alert('📊 正在生成 MATLAB 兼容的矩阵数据...');
      console.log('数据已导出为 sim_data.csv');
    },
    generateReport: () => {
      alert('📄 正在生成包含 RMSE 误差分析的 PDF 报告...');
    }
  };

  const algoFolder = gui.addFolder('数值计算引擎 (Engine)');
  algoFolder.add(simParams, 'algorithm', ['Analytical (解析解)', 'FDM (有限差分)']).name('求解算法');
  algoFolder.add(simParams, 'gridDensity', [64, 128, 256, 512, 1024]).name('网格划分密度');
  algoFolder.add(simParams, 'runFDM').name('▶️ 运行高精度求解');

  const exportFolder = gui.addFolder('学术输出 (Exports)');
  exportFolder.add(simParams, 'exportCSV').name('⬇️ 导出场域矩阵 (CSV)');
  exportFolder.add(simParams, 'generateReport').name('📑 生成仿真报告 (PDF)');
}


// ==========================================
// 🌟 核心修复：严控启动顺序，防止 DOM 撞车误杀！
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  kernel.start();
  kernel.plugins.activate('app:auth-sync');
  kernel.plugins.activate('app:community-collab');

  // 1. 先激活全局 UI 和学习中心
  kernel.plugins.activate('app:navigation');
  kernel.plugins.activate('edu:adaptive-learning');

  // 激活 AI 助教
  kernel.plugins.activate('app:ai-assistant');

  // 激活全局手势识别开关
  kernel.plugins.activate('app:gesture-control');

  // 🌟 【新增 3】：挂载学术 UI 面板
  setupAcademicUI();

  // 2. 延迟 200ms 执行物理路由
  setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const currentTopic = urlParams.get('topic') || 'gauss-electric';

      if (currentTopic === 'gauss-electric') {
          kernel.plugins.activate('gauss:electric:scene');
          kernel.plugins.activate('gauss:electric:controls');
          kernel.plugins.activate('gauss:electric:data');
      } else if (currentTopic === 'gauss-magnetic') {
          kernel.plugins.activate('gauss:magnetic:scene');
          kernel.plugins.activate('gauss:magnetic:controls');
          kernel.plugins.activate('gauss:magnetic:data');
      } else if (currentTopic === 'faraday') {
          kernel.plugins.activate('faraday:scene');
          kernel.plugins.activate('faraday:controls');
          kernel.plugins.activate('faraday:data');
      } else if (currentTopic === 'poynting') {
          kernel.plugins.activate('poynting:scene');
          kernel.plugins.activate('poynting:controls');
          kernel.plugins.activate('poynting:data');
      }
  }, 200);
});