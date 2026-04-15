import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class GesturePlugin implements BasePlugin<AppState> {
    name = 'app:gesture-control';
    version = '2.2.0'; // 升级：精简移除不稳定手势，聚焦右手精准参数操控
    private context!: PluginContext<AppState>;

    private videoEl!: HTMLVideoElement;
    private canvasEl!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private isRunning = false;
    private isLoading = false;

    private readonly CDN_BASE = 'https://unpkg.com';

    private targetRadius = 6.0; private smoothedRadius = 6.0;
    private targetX = 0;        private smoothedX = 0;
    private targetY = 0;        private smoothedY = 0;
    private targetStrength = 5.0; private smoothedStrength = 5.0;
    private targetOmega = 1.0;  private smoothedOmega = 1.0;
    private targetArea = 16.0;  private smoothedArea = 16.0;
    private targetFreq = 1.0;   private smoothedFreq = 1.0;
    private targetAmp = 3.0;    private smoothedAmp = 3.0;

    private updateTimer: number = 0;

    install(context: PluginContext<AppState>) { this.context = context; }

    activate() {
        this.initUI();

        this.context.state.watch((prop, newVal) => {
            if (prop === 'activeTopic') this.updateGuideUI(newVal as string);
        });

        this.updateGuideUI(this.context.state.state.activeTopic || 'gauss-electric');
    }

    private initUI() {
        const btnHTML = `
            <div id="gesture-toggle-btn" class="fixed top-6 left-6 z-[1000] bg-slate-900/80 backdrop-blur-md border border-slate-600/50 rounded-full px-4 py-2 flex items-center cursor-pointer hover:bg-slate-800 transition-all shadow-[0_0_15px_rgba(0,255,204,0.2)]">
                <span id="gesture-icon" class="text-xl mr-2">🖐️</span>
                <span id="gesture-text" class="text-sm font-bold text-slate-300">开启手势操控</span>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', btnHTML);

        // 彻底锁死在屏幕左下角
        const pipHTML = `
            <div id="gesture-pip-container" class="fixed bottom-6 left-6 z-[1000] hidden flex-col items-start space-y-3 pointer-events-none">

                <div class="bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,255,204,0.15)] w-64 pointer-events-auto">
                    <h4 class="text-emerald-400 font-bold text-sm mb-3 border-b border-emerald-500/30 pb-2 flex items-center">
                        <span class="mr-2">🎮</span> 空间手势指南
                    </h4>
                    <ul id="gesture-guide-list" class="text-xs text-slate-300 space-y-3">
                        </ul>
                </div>

                <div class="flex flex-col items-start pointer-events-auto">
                    <div class="text-[10px] text-emerald-400 font-mono mb-1 font-bold bg-slate-900/80 px-2 py-1 rounded tracking-widest shadow-sm">HAND_TRACKING_ACTIVE</div>
                    <div class="relative w-48 h-36 bg-black rounded-xl border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] overflow-hidden">
                        <video id="gesture-video" class="absolute inset-0 w-full h-full object-cover hidden" autoplay playsinline></video>
                        <canvas id="gesture-canvas" class="absolute inset-0 w-full h-full object-cover transform -scale-x-100"></canvas>
                    </div>
                </div>

            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', pipHTML);

        this.videoEl = document.getElementById('gesture-video') as HTMLVideoElement;
        this.canvasEl = document.getElementById('gesture-canvas') as HTMLCanvasElement;
        this.ctx = this.canvasEl.getContext('2d')!;

        document.getElementById('gesture-toggle-btn')?.addEventListener('click', () => this.toggleGesture());
    }

    private updateGuideUI(topic: string) {
        const list = document.getElementById('gesture-guide-list');
        if (!list) return;

        // 移除全局的 1234 切换提示，只保留针对当前场景的右手说明
        let specificRule = '';
        if (topic === 'gauss-electric') {
            specificRule = `
                <li class="flex items-center"><span class="text-2xl mr-3">🤏</span><div><span class="font-bold text-white text-sm">右手捏合 / 张开</span><br><span class="text-slate-400">控制高斯球半径</span></div></li>
                <li class="flex items-center"><span class="text-2xl mr-3">👋</span><div><span class="font-bold text-white text-sm">右手上下左右平移</span><br><span class="text-slate-400">控制高斯球空间位置</span></div></li>
            `;
        } else if (topic === 'gauss-magnetic') {
            specificRule = `
                <li class="flex items-center"><span class="text-2xl mr-3">🤏</span><div><span class="font-bold text-white text-sm">右手捏合 / 张开</span><br><span class="text-slate-400">控制高斯面半径</span></div></li>
                <li class="flex items-center"><span class="text-2xl mr-3">↔️</span><div><span class="font-bold text-white text-sm">右手左右移动</span><br><span class="text-slate-400">调节磁场强度</span></div></li>
            `;
        } else if (topic === 'faraday') {
            specificRule = `
                <li class="flex items-center"><span class="text-2xl mr-3">🤏</span><div><span class="font-bold text-white text-sm">右手捏合 / 张开</span><br><span class="text-slate-400">控制线圈面积大小</span></div></li>
                <li class="flex items-center"><span class="text-2xl mr-3">↔️</span><div><span class="font-bold text-white text-sm">右手左右移动</span><br><span class="text-slate-400">控制线圈旋转角速度</span></div></li>
            `;
        } else if (topic === 'poynting') {
            specificRule = `
                <li class="flex items-center"><span class="text-2xl mr-3">↕️</span><div><span class="font-bold text-white text-sm">右手上下移动</span><br><span class="text-slate-400">控制电磁波振幅</span></div></li>
                <li class="flex items-center"><span class="text-2xl mr-3">↔️</span><div><span class="font-bold text-white text-sm">右手左右移动</span><br><span class="text-slate-400">控制电磁波频率</span></div></li>
            `;
        }
        list.innerHTML = specificRule;
    }

    private async toggleGesture() {
        if (this.isRunning) { window.location.reload(); return; }
        if (this.isLoading) return;

        this.isLoading = true;
        this.updateBtnState('⏳', '加载 AI 视觉库...', 'text-yellow-400');

        try {
            await this.loadScript(`${this.CDN_BASE}/@mediapipe/camera_utils/camera_utils.js`);
            await this.loadScript(`${this.CDN_BASE}/@mediapipe/hands/hands.js`);
            this.updateBtnState('📷', '请求摄像头权限...', 'text-blue-400');
            await this.startMediaPipe();

            this.isRunning = true;
            this.isLoading = false;
            this.updateBtnState('🟢', '手势操控已开启', 'text-emerald-400');
            document.getElementById('gesture-pip-container')?.classList.remove('hidden');
            document.getElementById('gesture-pip-container')?.classList.add('flex');

            this.startSmoothingLoop();
        } catch (error: any) {
            console.error(error);
            this.isLoading = false;
            this.updateBtnState('🔴', '无法获取摄像头或网络超时', 'text-red-400');
            setTimeout(() => this.updateBtnState('🖐️', '开启手势操控', 'text-slate-300'), 4000);
        }
    }

    private startMediaPipe() {
        return new Promise<void>((resolve, reject) => {
            try {
                const hands = new (window as any).Hands({ locateFile: (file: string) => `${this.CDN_BASE}/@mediapipe/hands/${file}` });
                hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
                hands.onResults((results: any) => {
                    this.drawLandmarks(results);
                    this.processGestures(results);
                });
                const camera = new (window as any).Camera(this.videoEl, { onFrame: async () => { await hands.send({ image: this.videoEl }); }, width: 320, height: 240 });
                camera.start().then(() => resolve()).catch(() => reject(new Error('Cam failed')));
            } catch (err) { reject(err); }
        });
    }

    private processGestures(results: any) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

        let rightHand = null;

        // 寻找右手（注意 MediaPipe 镜像翻转，实际摄像头里的右手会被识别为 Left）
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            if (results.multiHandedness[i].label === 'Left') { // 实际上对应画面中的右手
                rightHand = results.multiHandLandmarks[i];
            }
        }

        const activeTopic = this.context.state.state.activeTopic;

        // 🎯 仅保留精准的右手参数控制逻辑
        if (rightHand) {
            const xPos = 1.0 - rightHand[8].x;
            const yPos = rightHand[8].y;
            const pinchDist = Math.sqrt(Math.pow(rightHand[8].x - rightHand[4].x, 2) + Math.pow(rightHand[8].y - rightHand[4].y, 2));

            if (activeTopic === 'gauss-electric') {
                this.targetRadius = Math.max(1.0, Math.min(15.0, 1.0 + (pinchDist - 0.02) * (14.0 / 0.18)));
                this.targetX = (xPos - 0.5) * 24;
                this.targetY = -(yPos - 0.5) * 24;
            }
            else if (activeTopic === 'gauss-magnetic') {
                this.targetRadius = Math.max(1.0, Math.min(15.0, 1.0 + (pinchDist - 0.02) * (14.0 / 0.18)));
                this.targetStrength = 1.0 + xPos * 9.0;
            }
            else if (activeTopic === 'faraday') {
                this.targetArea = Math.max(5.0, Math.min(30.0, 5.0 + (pinchDist - 0.02) * (25.0 / 0.18)));
                this.targetOmega = xPos * 5.0;
            }
            else if (activeTopic === 'poynting') {
                this.targetFreq = 0.1 + xPos * 4.9;
                this.targetAmp = 10.0 - yPos * 9.0;
            }
        }
    }

    private startSmoothingLoop() {
        this.updateTimer = window.setInterval(() => {
            const activeTopic = this.context.state.state.activeTopic;
            let updates: Partial<AppState> = {};
            const lerp = (start: number, end: number) => start * 0.8 + end * 0.2;

            if (activeTopic === 'gauss-electric') {
                this.smoothedRadius = lerp(this.smoothedRadius, this.targetRadius);
                this.smoothedX = lerp(this.smoothedX, this.targetX);
                this.smoothedY = lerp(this.smoothedY, this.targetY);
                updates = { radius: parseFloat(this.smoothedRadius.toFixed(1)), x: parseFloat(this.smoothedX.toFixed(1)), y: parseFloat(this.smoothedY.toFixed(1)) };
            }
            else if (activeTopic === 'gauss-magnetic') {
                this.smoothedRadius = lerp(this.smoothedRadius, this.targetRadius);
                this.smoothedStrength = lerp(this.smoothedStrength, this.targetStrength);
                updates = { radius: parseFloat(this.smoothedRadius.toFixed(1)), magnetStrength: parseFloat(this.smoothedStrength.toFixed(1)) };
            }
            else if (activeTopic === 'faraday') {
                this.smoothedArea = lerp(this.smoothedArea, this.targetArea);
                this.smoothedOmega = lerp(this.smoothedOmega, this.targetOmega);
                updates = { coilArea: parseFloat(this.smoothedArea.toFixed(1)), coilOmega: parseFloat(this.smoothedOmega.toFixed(1)) };
            }
            else if (activeTopic === 'poynting') {
                this.smoothedFreq = lerp(this.smoothedFreq, this.targetFreq);
                this.smoothedAmp = lerp(this.smoothedAmp, this.targetAmp);
                updates = { waveFreq: parseFloat(this.smoothedFreq.toFixed(1)), waveAmp: parseFloat(this.smoothedAmp.toFixed(1)) };
            }

            if (Object.keys(updates).length > 0) {
                this.context.state.setState(updates);
                this.syncSlidersToDOM(updates);
            }
        }, 30);
    }

    private syncSlidersToDOM(updates: any) {
        const updateSlider = (id: string, valId: string, val: number) => {
            const slider = document.getElementById(id) as HTMLInputElement;
            const disp = document.getElementById(valId);
            if (slider && disp) { slider.value = val.toString(); disp.innerText = val.toFixed(1); }
        };
        if (updates.radius !== undefined) { updateSlider('radiusSlider', 'valR', updates.radius); updateSlider('magRadiusSlider', 'valMagR', updates.radius); }
        if (updates.x !== undefined) updateSlider('xSlider', 'valX', updates.x);
        if (updates.y !== undefined) updateSlider('ySlider', 'valY', updates.y);
        if (updates.magnetStrength !== undefined) updateSlider('magStrengthSlider', 'valMagStrength', updates.magnetStrength);
        if (updates.coilArea !== undefined) updateSlider('coilAreaSlider', 'valArea', updates.coilArea);
        if (updates.coilOmega !== undefined) updateSlider('coilOmegaSlider', 'valOmega', updates.coilOmega);
        if (updates.waveFreq !== undefined) updateSlider('waveFreqSlider', 'valWaveFreq', updates.waveFreq);
        if (updates.waveAmp !== undefined) updateSlider('waveAmpSlider', 'valWaveAmp', updates.waveAmp);
    }

    private drawLandmarks(results: any) {
        this.canvasEl.width = this.videoEl.videoWidth; this.canvasEl.height = this.videoEl.videoHeight;
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvasEl.width, this.canvasEl.height);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
                this.ctx.strokeStyle = '#00ffcc'; this.ctx.lineWidth = 2;
                for (const [i, j] of connections) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(landmarks[i].x * this.canvasEl.width, landmarks[i].y * this.canvasEl.height);
                    this.ctx.lineTo(landmarks[j].x * this.canvasEl.width, landmarks[j].y * this.canvasEl.height);
                    this.ctx.stroke();
                }
                this.ctx.fillStyle = '#ff0055';
                for (const lm of landmarks) {
                    this.ctx.beginPath();
                    this.ctx.arc(lm.x * this.canvasEl.width, lm.y * this.canvasEl.height, 3, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }
        }
    }

    private updateBtnState(icon: string, text: string, colorClass: string) {
        const iconEl = document.getElementById('gesture-icon');
        const textEl = document.getElementById('gesture-text');
        if (iconEl) iconEl.innerText = icon;
        if (textEl) { textEl.innerText = text; textEl.className = `text-sm font-bold ${colorClass}`; }
    }

    private loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let isResolved = false;
            const script = document.createElement('script'); script.src = src; script.crossOrigin = "anonymous";
            script.onload = () => { isResolved = true; resolve(); };
            script.onerror = () => { isResolved = true; reject(new Error(`加载失败: ${src}`)); };
            document.head.appendChild(script);
            setTimeout(() => { if (!isResolved) reject(new Error(`网络加载超时`)); }, 12000);
        });
    }

    deactivate() {
        clearInterval(this.updateTimer);
        document.getElementById('gesture-toggle-btn')?.remove();
        document.getElementById('gesture-pip-container')?.remove();
    }

    uninstall() {}
}