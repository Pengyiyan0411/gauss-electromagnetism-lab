import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import * as echarts from 'echarts';

export class TeacherDashboardPlugin implements BasePlugin<AppState> {
    name = 'TeacherDashboard'; // 必须和 main.ts 里的 activate 名称一致
    version = '1.0.0';
    private context!: PluginContext<AppState>;
    private container!: HTMLDivElement;
    private isVisible = false;

    // 图表实例引用，用于重绘
    private charts: echarts.ECharts[] = [];

    install(context: PluginContext<AppState>) {
        this.context = context;
    }

    activate() {
        this.initUI();
        this.bindEvents();
    }

    private initUI() {
        // 创建全屏的毛玻璃大屏遮罩
        this.container = document.createElement('div');
        this.container.id = 'teacher-dashboard';
        this.container.className = 'fixed inset-0 z-[5000] bg-slate-900/90 backdrop-blur-xl hidden flex-col transition-opacity duration-300 opacity-0';

        this.container.innerHTML = `
            <div class="flex justify-between items-center p-6 border-b border-slate-700/50 bg-slate-800/50">
                <div class="flex items-center space-x-4">
                    <span class="text-4xl">👑</span>
                    <div>
                        <h1 class="text-2xl font-black text-white tracking-widest">Gauss 智慧教学中枢 <span class="text-sm font-normal text-indigo-400 border border-indigo-400/50 bg-indigo-400/10 px-2 py-0.5 rounded ml-2">教师端 (Admin)</span></h1>
                        <p class="text-slate-400 text-sm mt-1">大学物理实验 · 班级数据实时监控大屏</p>
                    </div>
                </div>
                <button id="close-dashboard-btn" class="bg-slate-700 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold transition">关闭大屏 (ESC)</button>
            </div>

            <div class="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">

                <div class="col-span-12 grid grid-cols-4 gap-6">
                    <div class="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <p class="text-slate-400 text-sm font-bold">班级总人数</p>
                        <p class="text-4xl font-black text-white mt-2">45 <span class="text-sm text-emerald-400">+2</span></p>
                    </div>
                    <div class="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <p class="text-slate-400 text-sm font-bold">当前在线探索者</p>
                        <p class="text-4xl font-black text-blue-400 mt-2">12 <span class="text-sm text-slate-500">人</span></p>
                    </div>
                    <div class="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <p class="text-slate-400 text-sm font-bold">实验平均完成率</p>
                        <p class="text-4xl font-black text-indigo-400 mt-2">78.5 <span class="text-sm text-slate-500">%</span></p>
                    </div>
                    <div class="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <p class="text-slate-400 text-sm font-bold">触发高斯定理求助</p>
                        <p class="text-4xl font-black text-amber-400 mt-2">8 <span class="text-sm text-slate-500">次</span></p>
                    </div>
                </div>

                <div class="col-span-4 bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
                    <h2 class="text-lg font-bold text-white mb-4">📍 各模块实验进度分布</h2>
                    <div id="chart-progress" class="flex-1 w-full min-h-[300px]"></div>
                </div>

                <div class="col-span-4 bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
                    <h2 class="text-lg font-bold text-white mb-4">🎯 班级知识薄弱点分析</h2>
                    <div id="chart-radar" class="flex-1 w-full min-h-[300px]"></div>
                </div>

                <div class="col-span-4 bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
                    <h2 class="text-lg font-bold text-white mb-4">📡 学生实时物理状态流</h2>
                    <div class="flex-1 overflow-y-auto space-y-3 pr-2">
                        <div class="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                            <p class="text-sm text-slate-300"><span class="text-blue-400 font-bold">张三</span> 刚放置了一个 <span class="text-red-400">+3q</span> 电荷</p>
                            <p class="text-xs text-slate-500 mt-1">场景: 库仑定律 | 10秒前</p>
                        </div>
                        <div class="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                            <p class="text-sm text-slate-300"><span class="text-emerald-400 font-bold">李四</span> 完成了 法拉第电磁感应 实验</p>
                            <p class="text-xs text-slate-500 mt-1">场景: 磁场感应 | 1分钟前</p>
                        </div>
                        <div class="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <p class="text-sm text-amber-400 font-bold">⚠️ 王五 计算高斯面积积分失败 3 次</p>
                            <p class="text-xs text-slate-500 mt-1">建议: 触发 AI 助教辅导 | 3分钟前</p>
                        </div>
                        <div class="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                            <p class="text-sm text-slate-300"><span class="text-blue-400 font-bold">赵六</span> 导出了实验数据报表</p>
                            <p class="text-xs text-slate-500 mt-1">场景: 坡印廷矢量 | 5分钟前</p>
                        </div>
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(this.container);
    }

    private bindEvents() {
        // 绑定 T 键：全员可开（为了演示和比赛方便）
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't') {
                this.togglePanel();
            }
            // 按 ESC 也可以关闭
            if (e.key === 'Escape' && this.isVisible) {
                this.togglePanel();
            }
        });

        // 绑定关闭按钮
        document.getElementById('close-dashboard-btn')?.addEventListener('click', () => {
            this.togglePanel();
        });

        // 监听窗口大小变化重绘 ECharts
        window.addEventListener('resize', () => {
            this.charts.forEach(chart => chart.resize());
        });
    }

    private togglePanel() {
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            this.container.classList.remove('hidden');
            // 延迟一点点添加 opacity 触发过渡动画
            setTimeout(() => {
                this.container.classList.remove('opacity-0');
                this.container.classList.add('opacity-100');
                this.renderCharts(); // 每次打开时重新渲染/动画
            }, 10);
        } else {
            this.container.classList.remove('opacity-100');
            this.container.classList.add('opacity-0');
            setTimeout(() => {
                this.container.classList.add('hidden');
                // 销毁图表释放内存
                this.charts.forEach(chart => chart.dispose());
                this.charts = [];
            }, 300); // 等待过渡动画结束
        }
    }

    private renderCharts() {
        // 渲染饼图
        const progressChartDom = document.getElementById('chart-progress');
        if (progressChartDom) {
            const progressChart = echarts.init(progressChartDom);
            progressChart.setOption({
                tooltip: { trigger: 'item' },
                legend: { top: '5%', left: 'center', textStyle: { color: '#94a3b8' } },
                series: [{
                    name: '实验进度', type: 'pie', radius: ['40%', '70%'],
                    itemStyle: { borderRadius: 10, borderColor: '#1e293b', borderWidth: 2 },
                    label: { show: false },
                    data: [
                        { value: 1048, name: '高斯电场', itemStyle: { color: '#6366f1' } },
                        { value: 735, name: '安培磁场', itemStyle: { color: '#3b82f6' } },
                        { value: 580, name: '法拉第感应', itemStyle: { color: '#10b981' } },
                        { value: 484, name: '坡印廷矢量', itemStyle: { color: '#f59e0b' } },
                    ]
                }]
            });
            this.charts.push(progressChart);
        }

        // 渲染雷达图
        const radarChartDom = document.getElementById('chart-radar');
        if (radarChartDom) {
            const radarChart = echarts.init(radarChartDom);
            radarChart.setOption({
                tooltip: {},
                radar: {
                    indicator: [
                        { name: '电场强度计算', max: 100 },
                        { name: '高斯面选取', max: 100 },
                        { name: '磁通量理解', max: 100 },
                        { name: '能量流向判断', max: 100 },
                        { name: '公式推导', max: 100 }
                    ],
                    axisName: { color: '#cbd5e1' },
                    splitLine: { lineStyle: { color: ['#334155'] } },
                    splitArea: { show: false }
                },
                series: [{
                    name: '班级平均 vs 优秀基准',
                    type: 'radar',
                    data: [
                        { value: [65, 40, 70, 55, 50], name: '班级平均水平',
                          itemStyle: { color: '#f43f5e' }, areaStyle: { color: 'rgba(244, 63, 94, 0.2)' } },
                        { value: [90, 85, 95, 80, 85], name: '优秀基准',
                          itemStyle: { color: '#3b82f6' }, areaStyle: { color: 'rgba(59, 130, 246, 0.2)' } }
                    ]
                }]
            });
            this.charts.push(radarChart);
        }
    }

    deactivate() {
        if (this.container) this.container.remove();
        this.charts.forEach(chart => chart.dispose());
    }

    uninstall() {}
}