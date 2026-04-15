import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class AdaptiveLearningPlugin implements BasePlugin<AppState> {
    name = 'edu:adaptive-learning';
    version = '2.2.0'; // 升级：加入 80% 实操考核系统与 100% 奖杯锁定机制
    private context!: PluginContext<AppState>;

    private mastery: number = 20.0;
    private lastQuestionIdx: Record<string, number> = {};

    private KNOWLEDGE: Record<string, any> = {
        'gauss-electric': { title: '高斯定律 (静电场)', exp: '高斯定律表明，穿过任意闭合曲面的净电通量，仅由该曲面内部包围的净电荷决定。与外部电荷的位置无关。' },
        'gauss-magnetic': { title: '高斯定律 (磁场)', exp: '高斯磁场定律指出，穿过任意闭合曲面的净磁通量恒等于零。这意味着自然界中不存在孤立的磁单极子。' },
        'faraday': { title: '法拉第电磁感应定律', exp: '法拉第电磁感应定律指出，闭合回路中产生的感生电动势与穿过该回路的磁通量的时间变化率成正比。' },
        'poynting': { title: '坡印廷定理', exp: '坡印廷矢量 S = (1/μ₀) E × B，表示电磁场中单位时间穿过单位面积的能量，直观展示了能量传播方向。' }
    };

    // 选择题库 (0% ~ 80% 使用)
    private QUIZ_BANK: Record<string, any[]> = {
        'gauss-electric': [
            { q: '高斯球面的半径扩大一倍，穿过该球面的总电通量会如何变化？', options: ['扩大为原来的 4 倍', '扩大为原来的 2 倍', '保持不变', '缩小为原来的一半'], ans: 2 },
            { q: '如果高斯面内没有净电荷，球面上的电场强度一定为零吗？', options: ['一定为零', '不一定为零，但总通量为零', '一定不为零', '取决于球面的大小'], ans: 1 },
            { q: '将一个点电荷移到闭合高斯面之外，穿过该高斯面的总电通量如何变化？', options: ['变为零', '保持不变', '变大', '变小'], ans: 0 },
            { q: '高斯定理通常在什么情况下最容易用来计算电场强度？', options: ['任何情况', '电荷分布极不规则时', '系统具有高度对称性时', '只适用于点电荷'], ans: 2 }
        ],
        'gauss-magnetic': [
            { q: '高斯磁场定律表明，穿过任意闭合曲面的净磁通量恒等于：', options: ['正值', '负值', '零', '取决于内部磁极数量'], ans: 2 },
            { q: '如果把一块磁铁从中间截断，你会得到什么？', options: ['只有N极和只有S极的两块', '两块失去磁性的铁', '两块分别有N极和S极的新磁铁', '无法确定'], ans: 2 },
            { q: '磁感应线具有什么重要的几何特征？', options: ['总是起于正极，止于负极', '总是闭合曲线，无头无尾', '可以相互交叉', '只能是直线'], ans: 1 },
            { q: '高斯磁场定律的微分形式 ∇·B = 0 意味着磁场是：', options: ['有源场', '无源场（管形场）', '保守场', '涡旋场'], ans: 1 }
        ],
        'faraday': [
            { q: '当线圈在匀强磁场中匀速旋转时，穿过线圈的磁通量与感生电动势存在什么相位关系？', options: ['同相', '相差 90 度', '相差 180 度', '无关联'], ans: 1 },
            { q: '如果将线圈的转速增加一倍，感生电动势的最大值会如何变化？', options: ['不变', '增加一倍', '增加四倍', '减小一半'], ans: 1 },
            { q: '楞次定律揭示了感生电流的什么特性？', options: ['总是顺时针流动', '阻碍引起感生电流的磁通量变化', '总是增强原磁场', '与原磁场方向垂直'], ans: 1 },
            { q: '如果穿过线圈的磁通量随时间做线性增加，感生电动势将如何？', options: ['线性增加', '指数增加', '保持恒定', '变为零'], ans: 2 }
        ],
        'poynting': [
            { q: '电磁波的能量传播方向与电场 E、磁场 B 的方向有什么关系？', options: ['平行于 E', '平行于 B', '同时垂直于 E 和 B', '与 E 和 B 成 45 度角'], ans: 2 },
            { q: '如果电磁波的电场振幅 E 扩大 2 倍，其平均能流密度会如何变化？', options: ['扩大 2 倍', '扩大 4 倍', '保持不变', '缩小一半'], ans: 1 },
            { q: '坡印廷矢量 S 的国际标准单位是什么？', options: ['J (焦耳)', 'W (瓦特)', 'W/m² (瓦特每平方米)', 'N·m (牛顿米)'], ans: 2 },
            { q: '坡印廷矢量的物理意义是表示什么？', options: ['电荷移动的速率', '电磁能量在空间中流动的面密度', '磁场的旋度', '电势的梯度'], ans: 1 }
        ]
    };

    // 🔥 实操考核题库 (80% ~ 100% 使用)
    private PRACTICAL_TASKS: Record<string, any> = {
        'gauss-electric': {
            q: '请在左侧（或使用右手捏合手势），将高斯球的半径 (R) 扩大至 10.0 以上。',
            check: (state: AppState) => state.radius >= 10.0,
            successMsg: '✅ 操作成功！您会发现无论高斯球面多大，只要包围的电荷不变，总电通量就恒定不变！'
        },
        'gauss-magnetic': {
            q: '请在左侧（或使用右手左右移动手势），将磁偶极子强度调节至 8.0 以上。',
            check: (state: AppState) => (state.magnetStrength || 5.0) >= 8.0,
            successMsg: '✅ 操作成功！无论磁场多么强大，穿过闭合球面的净磁通量依然死死地锁在 0 Wb！'
        },
        'faraday': {
            q: '请在左侧（或使用右手平移手势），将线圈旋转角速度 (ω) 调节至 3.0 以上。',
            check: (state: AppState) => (state.coilOmega || 1.0) >= 3.0,
            successMsg: '✅ 操作成功！转速越快，磁通量变化率越剧烈，您能看到感生电动势的峰值显著升高！'
        },
        'poynting': {
            q: '请在左侧（或使用右手上下移动手势），将电磁波的电场振幅 (E₀) 调至最大 (10.0)。',
            check: (state: AppState) => (state.waveAmp || 3.0) >= 9.9, // 容差
            successMsg: '✅ 操作成功！能流密度与电场振幅的平方成正比，能量的传输瞬间急剧增加！'
        }
    };

    install(context: PluginContext<AppState>) { this.context = context; }

    activate() {
        this.renderLayout();
        this.context.state.watch((prop, newVal) => {
            if (prop === 'activeTopic') {
                // 切换场景时，重置掌握度为 20%，重新开始学习
                this.mastery = 20.0;
                this.updateMasteryUI();
                this.updateContent(newVal as string);
            }
        });
        this.updateContent(this.context.state.state.activeTopic || 'gauss-electric');
    }

    private renderLayout() {
        const rightPanel = document.querySelector('.glass-scrollbar') || document.querySelector('.w-full.md\\:w-2\\/5.p-8') || document.body;
        if (document.getElementById('learning-center-panel')) return;

        const panelHTML = `
            <div id="learning-center-panel" class="mt-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-gray-800 flex items-center"><span class="mr-2">🎓</span> 智能学习中心</h2>
                    <button class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition">切换教师端</button>
                </div>
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                    <div class="flex justify-between text-xs font-bold text-gray-500 mb-2">
                        <span>知识点掌握率</span>
                        <span id="mastery-val" class="text-indigo-600">20.0%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2">
                        <div id="mastery-bar" class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: 20%"></div>
                    </div>
                </div>
                <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 mb-4">
                    <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center"><span class="mr-2">📖</span> 知识点讲解</h3>
                    <p id="learning-exp" class="text-xs text-gray-600 leading-relaxed"></p>
                </div>
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm" id="quiz-main-container">
                    <div id="quiz-container" class="mt-2 text-sm"></div>
                </div>
            </div>
        `;
        rightPanel.insertAdjacentHTML('beforeend', panelHTML);
    }

    private updateContent(topic: string) {
        const know = this.KNOWLEDGE[topic] || this.KNOWLEDGE['gauss-electric'];
        const expEl = document.getElementById('learning-exp');
        if (expEl) expEl.innerText = know.exp;
        this.renderQuiz(topic);
    }

    private renderQuiz(topic: string) {
        const container = document.getElementById('quiz-container');
        if (!container) return;

        container.innerHTML = '';

        // 🏆 阶段三：100% 满分锁定，显示奖杯
        if (this.mastery >= 100) {
            container.innerHTML = `
                <div class="text-center py-6 animate-fade-in">
                    <div class="text-6xl mb-4 filter drop-shadow-lg">🏆</div>
                    <h3 class="text-lg font-extrabold text-emerald-600 mb-2">恭喜！已完全掌握该定律！</h3>
                    <p class="text-xs text-gray-500 leading-relaxed px-4">您已通过了所有的理论测试与实操考核。现在您可以自由探索实验室，或切换到其他维度。</p>
                    <button id="reset-mastery-btn" class="mt-6 text-indigo-500 hover:text-indigo-700 font-bold text-xs underline decoration-indigo-300 underline-offset-4">🔄 重新开始本章挑战</button>
                </div>
            `;
            document.getElementById('reset-mastery-btn')?.addEventListener('click', () => {
                this.mastery = 20.0;
                this.updateMasteryUI();
                this.renderQuiz(topic);
            });
            return;
        }

        // 🔥 阶段二：80% 实操考核阶段
        if (this.mastery >= 80 && this.mastery < 100) {
            const task = this.PRACTICAL_TASKS[topic];
            container.innerHTML = `
                <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center"><span class="mr-2">🔥</span> 终极实操考核 <span class="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">硬核</span></h3>
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 shadow-inner">
                    <p class="font-bold text-amber-900 leading-relaxed text-sm">${task.q}</p>
                </div>
                <div id="quiz-feedback" class="mt-3 text-sm font-bold hidden"></div>
                <button id="quiz-verify-btn" class="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md">⚡ 验证引擎参数</button>
                <button id="quiz-next-btn" class="w-full mt-4 bg-emerald-500 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition shadow-md hidden">领取通关奖杯 🏆</button>
            `;

            document.getElementById('quiz-verify-btn')?.addEventListener('click', () => {
                // 直接从底层 AppState 中读取真实参数进行校验！
                const isSuccess = task.check(this.context.state.state);
                const feedback = document.getElementById('quiz-feedback');
                const verifyBtn = document.getElementById('quiz-verify-btn');
                const nextBtn = document.getElementById('quiz-next-btn');

                if (feedback && verifyBtn && nextBtn) {
                    feedback.classList.remove('hidden');
                    if (isSuccess) {
                        feedback.className = 'mt-3 text-sm font-bold text-emerald-700 p-3 bg-emerald-50 rounded-lg border border-emerald-200';
                        feedback.innerHTML = task.successMsg;
                        verifyBtn.style.display = 'none';
                        nextBtn.classList.remove('hidden');

                        this.mastery = 100;
                        this.updateMasteryUI();
                    } else {
                        feedback.className = 'mt-3 text-sm font-bold text-red-600 p-3 bg-red-50 rounded-lg border border-red-200';
                        feedback.innerHTML = '❌ 引擎检测失败：尚未达到要求。<br><span class="text-xs text-red-400 font-normal mt-1 block">请调整左侧的控制面板，或使用摄像头手势操控后再试。</span>';
                    }
                }
            });

            document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
                this.renderQuiz(topic); // 刷新将直接进入 100% 奖杯逻辑
            });
            return;
        }

        // 📝 阶段一：0% ~ 60% 选择题阶段
        const pool = this.QUIZ_BANK[topic];
        if (!pool || pool.length === 0) return;

        let qIdx = 0;
        if (pool.length > 1) {
            let lastIdx = this.lastQuestionIdx[topic] !== undefined ? this.lastQuestionIdx[topic] : -1;
            do { qIdx = Math.floor(Math.random() * pool.length); } while (qIdx === lastIdx);
        }

        this.lastQuestionIdx[topic] = qIdx;
        const question = pool[qIdx];

        let optionsHTML = '';
        question.options.forEach((opt: string, idx: number) => {
            optionsHTML += `
                <label class="block p-3 mb-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                    <input type="radio" name="quiz_opt" value="${idx}" class="mr-3 accent-indigo-600">
                    <span class="text-gray-700">${opt}</span>
                </label>
            `;
        });

        const diffStr = this.mastery >= 60 ? '困难' : (this.mastery >= 40 ? '中等' : '简单');
        const quizHTML = `
            <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center"><span class="mr-2">📝</span> 自适应练习 <span class="ml-2 text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">难度：${diffStr}</span></h3>
            <p class="font-bold text-gray-800 mb-4 leading-relaxed">${question.q}</p>
            <div id="quiz-options-wrapper">${optionsHTML}</div>
            <div id="quiz-feedback" class="mt-3 text-sm font-bold hidden"></div>
            <button id="quiz-submit-btn" class="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">提交答案</button>
            <button id="quiz-next-btn" class="w-full mt-4 bg-emerald-500 text-white py-2 rounded-lg font-bold hover:bg-emerald-600 transition shadow-sm hidden">下一题 ➡️</button>
        `;

        container.innerHTML = quizHTML;

        const submitBtn = document.getElementById('quiz-submit-btn');
        submitBtn?.addEventListener('click', () => {
            const selected = document.querySelector('input[name="quiz_opt"]:checked') as HTMLInputElement;
            const feedback = document.getElementById('quiz-feedback');
            const nextBtn = document.getElementById('quiz-next-btn');
            const wrapper = document.getElementById('quiz-options-wrapper');

            if (!selected) { alert('请先选择一个答案！'); return; }

            const isCorrect = parseInt(selected.value) === question.ans;
            wrapper?.querySelectorAll('input').forEach(input => (input as HTMLInputElement).disabled = true);
            submitBtn.style.display = 'none';

            if (feedback && nextBtn) {
                feedback.classList.remove('hidden');
                if (isCorrect) {
                    feedback.className = 'mt-3 text-sm font-bold text-emerald-600 p-3 bg-emerald-50 rounded-lg border border-emerald-100';
                    feedback.innerHTML = '✅ 回答正确！进度 +20%';
                    this.mastery = Math.min(80, this.mastery + 20); // 选择题最多加到 80%
                    this.updateMasteryUI();
                } else {
                    feedback.className = 'mt-3 text-sm font-bold text-red-500 p-3 bg-red-50 rounded-lg border border-red-100';
                    feedback.innerHTML = `❌ 回答错误。<br><span class="text-gray-600 font-normal text-xs mt-1 block">正确答案是: ${question.options[question.ans]}</span>`;
                }

                nextBtn.classList.remove('hidden');
                if (this.mastery >= 80) {
                    nextBtn.innerText = '进入终极实操考核 🔥';
                    nextBtn.className = 'w-full mt-4 bg-amber-500 text-white py-2.5 rounded-lg font-bold hover:bg-amber-600 transition shadow-md';
                }
            }
        });

        document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
            this.renderQuiz(topic);
        });
    }

    private updateMasteryUI() {
        const bar = document.getElementById('mastery-bar');
        const val = document.getElementById('mastery-val');
        if (bar) {
            bar.style.width = `${this.mastery}%`;
            bar.className = this.mastery >= 100 ? 'bg-emerald-500 h-2 rounded-full transition-all duration-500' : 'bg-indigo-600 h-2 rounded-full transition-all duration-500';
        }
        if (val) {
            if (this.mastery >= 100) {
                val.innerHTML = `<span class="text-emerald-500">🏆 完全掌握 (100%)</span>`;
            } else if (this.mastery >= 80) {
                val.innerHTML = `<span class="text-amber-500">🔥 待实操 (80%)</span>`;
            } else {
                val.innerText = `${this.mastery.toFixed(1)}%`;
            }
        }
    }

    deactivate() {
        const p = document.getElementById('learning-center-panel');
        if (p) p.remove();
    }
    uninstall() {}
}