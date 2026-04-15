import './styles/index.css'; // Tailwind 样式
import { Kernel } from './core';
import { AppState } from './types';

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
// 🌟 核心修复：严控启动顺序，防止 DOM 撞车误杀！
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  kernel.start();
  kernel.plugins.activate('app:auth-sync');
  kernel.plugins.activate('app:community-collab');
  // 1. 先激活全局 UI 和学习中心 (让学习中心先去占领和清理 DOM)
  kernel.plugins.activate('app:navigation');
  kernel.plugins.activate('edu:adaptive-learning');

  // 激活 AI 助教，它会在右下角生成一个悬浮按钮
  kernel.plugins.activate('app:ai-assistant');

  // 激活全局手势识别开关 (它会安静地待在左上角等待点击)
  kernel.plugins.activate('app:gesture-control');

  // 2. 延迟 200ms 执行物理路由，等网页 HTML 彻底稳定后再挂载各个面板！
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