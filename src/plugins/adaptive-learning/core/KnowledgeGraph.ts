import { STATIC_CHARGES } from '../../shared/constants';

export interface Exercise {
  id: string;
  level: 1 | 2 | 3;
  question: string;
  options?: string[];
  answer: number | string | ((state: any) => boolean);
  explanation: string;
}

export interface KnowledgeNode {
  topicId: string;
  title: string;
  prerequisites: string[];
  lecture: string;
  exercises: Exercise[];
}

export const ELECTROMAGNETIC_GRAPH: Record<string, KnowledgeNode> = {
  'gauss-electric': {
    topicId: 'gauss-electric',
    title: '高斯静电场定律',
    prerequisites: [],
    lecture: `
      <p class="mb-2">高斯定律是电磁学基石，指出穿过任意闭合曲面的电通量与该曲面所包围的净电荷成正比。</p>
      <p class="font-bold text-blue-600 mb-2">提示：左侧 3D 空间已标注各个电荷的电量。调整高斯球的坐标将其精准包围！</p>
    `,
    exercises: [
      {
        id: 'ge-1', level: 1,
        question: '如果将高斯球的半径扩大一倍，穿过该球面的总电通量会如何变化？',
        options: ['扩大为原来的 4 倍', '扩大为原来的 2 倍', '保持不变', '缩小为原来的一半'],
        answer: 2,
        explanation: '根据高斯定律，电通量仅取决于球面内部包围的净电荷量，与球面的大小和形状无关。'
      },
      {
        id: 'ge-2', level: 2,
        question: '如果高斯面内包围了 +3q 和 -1q 两个电荷，净电通量正比于？',
        options: ['+4q', '+2q', '-1q', '+3q'],
        answer: 1,
        explanation: '净电荷等于系统内所有电荷的代数和，即 (+3q) + (-1q) = +2q。'
      },
      {
        id: 'ge-3', level: 3,
        question: '【实验操作】请在左侧 3D 实验台中，移动球心 X/Y/Z 轴，使高斯球面恰好包围且仅包围净电荷为 +1q 的组合。',
        answer: (state: any) => {
            // 【真实物理计算】：遍历空间中所有电荷，计算是否在高斯球半径内
            let netCharge = 0;
            STATIC_CHARGES.forEach((c: any) => {
              let dx = c.pos.x - state.x; let dy = c.pos.y - state.y; let dz = c.pos.z - state.z;
              if (Math.sqrt(dx*dx + dy*dy + dz*dz) <= state.radius) {
                  netCharge += c.q;
              }
            });
            return netCharge === 1; // 只要净电荷等于 1 就算绝对正确！
        },
        explanation: '当你同时包围了带正电和带负电的电荷使其代数和为 +1q 时，你就会看到右侧数据的净电荷变为 +1。'
      },
      {
        id: 'ge-4', level: 3,
        question: '【实验操作】请缩小高斯球半径至 3.0 以下，并将其移动至空白区域（不包围任何电荷）。',
        answer: (state: any) => {
            let enclosedCount = 0;
            STATIC_CHARGES.forEach((c: any) => {
              let dx = c.pos.x - state.x; let dy = c.pos.y - state.y; let dz = c.pos.z - state.z;
              if (Math.sqrt(dx*dx + dy*dy + dz*dz) <= state.radius) {
                  enclosedCount++;
              }
            });
            return state.radius <= 3.0 && enclosedCount === 0;
        },
        explanation: '当内部不包含电荷时，净电通量为 0。穿出高斯面的电场线与穿入的电场线完全抵消。'
      }
    ]
  },
  'gauss-magnetic': {
    topicId: 'gauss-magnetic',
    title: '高斯磁场定律',
    prerequisites: ['gauss-electric'],
    lecture: `<p>高斯磁场定律表明，自然界中不存在磁单极子。穿入任何闭合曲面的磁感线必然穿出。</p>`,
    exercises: [
      {
        id: 'gm-1', level: 1,
        question: '穿过任意包裹着条形磁铁的闭合高斯面的净磁通量是多少？',
        options: ['正值', '负值', '恒等于零', '取决于磁铁强度'],
        answer: 2,
        explanation: '磁场无源，磁感线总是闭合曲线，净磁通量恒为 0。'
      },
      {
        id: 'gm-2', level: 3,
        question: '【实验操作】请将磁铁强度(μ)调至最大(10.0)，观察净磁通量是否发生改变？完成后提交。',
        answer: (state: any) => { return state.magnetStrength >= 9.5; },
        explanation: '无论磁铁多强，高斯磁场定律依然成立，净磁通量永远为 0。'
      }
    ]
  },
  'faraday': {
    topicId: 'faraday',
    title: '法拉第电磁感应定律',
    prerequisites: ['gauss-magnetic'],
    lecture: `<p class="mb-2">法拉第电磁感应定律指出，闭合回路中产生的感生电动势与穿过该回路的磁通量变化率成正比。</p>`,
    exercises: [
      {
        id: 'fa-1', level: 2,
        question: '当线圈在匀强磁场中匀速旋转时，穿过线圈的磁通量与感生电动势存在什么关系？',
        options: ['同相', '相差 90 度', '相差 180 度', '无关系'],
        answer: 1,
        explanation: '磁通量按余弦变化时，其导数（电动势）按正弦变化，相差 90 度。'
      },
      {
        id: 'fa-2', level: 3,
        question: '【实验操作】目前感生电动势较小。请调整参数，使线圈角速度(ω)大于 3.0，并观察上方数据的感生电动势峰值。',
        answer: (state: any) => { return state.coilOmega >= 3.0; },
        explanation: '感生电动势峰值 E_max = NBAω。提高角速度能显著增加峰值！'
      }
    ]
  },
  'poynting': {
    topicId: 'poynting',
    title: '坡印廷定理 (能流密度)',
    prerequisites: ['faraday'],
    lecture: `<p class="mb-2">坡印廷矢量 S = (1/μ₀) E × B，表示电磁场中单位时间穿过单位面积的能量。</p>`,
    exercises: [
      {
        id: 'py-1', level: 1,
        question: '电磁波的能量传播方向与电场 E、磁场 B 的方向有什么关系？',
        options: ['平行于 E', '平行于 B', '同时垂直于 E 和 B', '与 E 和 B 成 45 度角'],
        answer: 2,
        explanation: '根据叉乘规则，能量传播方向(S)始终垂直于电场和磁场所在的平面。'
      }
    ]
  }
};