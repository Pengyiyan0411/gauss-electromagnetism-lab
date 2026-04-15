import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

export class CommunityCollabPlugin implements BasePlugin<AppState> {
    name = 'app:community-collab';
    version = '1.2.0'; // 🌟 升级：加入橡皮擦与全网实时清屏功能
    private context!: PluginContext<AppState>;

    // --- 网络与通信引擎 ---
    private socket: any = null;
    private readonly WS_URL = 'http://localhost:3000/physics-collab';
    private isConnected = false;
    private offlineQueue: any[] = [];
    private isRemoteSyncing = false;

    // --- 房间与 WebRTC (语音) ---
    private currentRoom: string | null = null;
    private peers: Record<string, RTCPeerConnection> = {};
    private localStream: MediaStream | null = null;
    private isMuted = true;

    // --- 屏幕标注与录制 ---
    private isDrawing = false;
    private annotating = false;
    private isErasing = false; // 🌟 新增：橡皮擦状态
    private ctx!: CanvasRenderingContext2D;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];

    install(context: PluginContext<AppState>) { this.context = context; }

    activate() {
        this.initUI();
        this.bindEvents();
        this.initAnnotationLayer();

        this.context.state.watch((prop, val) => {
            if (this.isRemoteSyncing || !this.currentRoom || !this.isConnected) return;
            this.broadcastState({ [prop]: val });
        });
    }

    // ==========================================
    // 🌐 1. Socket.IO 实时同步引擎
    // ==========================================
    private async connectWebSocket() {
        if (this.socket && this.socket.connected) return;

        const token = localStorage.getItem('gauss_token');
        if (!token) { alert('请先登录以使用协作功能'); return; }

        this.updateRoomUI('connecting');

        if (!(window as any).io) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        this.socket = (window as any).io(this.WS_URL, { auth: { token } });

        this.socket.on('connect', () => {
            console.log('🔗 Socket.IO 连接成功');
            this.isConnected = true;
            this.updateRoomUI('connected');
            this.socket.emit('joinRoom', { roomId: this.currentRoom });

            while (this.offlineQueue.length > 0) {
                const msg = this.offlineQueue.shift();
                this.socket.emit(msg.event, msg.data);
            }
        });

        this.socket.on('physicsStateUpdated', (payload: any) => {
            this.isRemoteSyncing = true;
            this.context.state.setState(payload.updates);
            setTimeout(() => { this.isRemoteSyncing = false; }, 50);
        });

        // 🌟 接收远端的画笔、橡皮擦或清屏指令
        this.socket.on('drawSync', (payload: any) => {
            this.drawOnCanvas(payload.x, payload.y, payload.type);
        });

        this.socket.on('userJoined', (payload: any) => {
            this.showToast(`🧑‍🎓 新成员加入了实验室`);
            this.initiateWebRTCPeer(payload.userId);
        });

        this.socket.on('webrtc-signal', (payload: any) => {
            this.handleWebRTCMessage(payload);
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateRoomUI('disconnected');
        });

        this.socket.on('connect_error', (err: any) => {
            console.error('Socket连接失败:', err.message);
            this.updateRoomUI('disconnected');
            this.showToast(`❌ 连接失败: ${err.message}`);
        });
    }

    private sendWsMessage(event: string, data: any) {
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
        } else {
            this.offlineQueue.push({ event, data });
        }
    }

    private broadcastState(updates: any) {
        this.sendWsMessage('syncPhysicsState', { roomId: this.currentRoom, stateUpdate: updates });
    }

    // ==========================================
    // 🎙️ 2. WebRTC 纯原生语音通信系统
    // ==========================================
    private async toggleVoice() {
        if (!this.localStream) {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                this.isMuted = false;
                document.getElementById('voice-btn')!.innerHTML = '🎤 语音开';
                document.getElementById('voice-btn')!.classList.replace('bg-slate-700', 'bg-emerald-600');
                this.showToast('✅ 麦克风已开启');

                Object.values(this.peers).forEach(pc => {
                    this.localStream!.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
                });
            } catch (e) {
                alert('无法获取麦克风权限，语音功能已禁用。');
            }
        } else {
            this.isMuted = !this.isMuted;
            this.localStream.getAudioTracks()[0].enabled = !this.isMuted;
            const btn = document.getElementById('voice-btn')!;
            btn.innerHTML = this.isMuted ? '🔇 语音关' : '🎤 语音开';
            btn.className = this.isMuted ? 'btn-tool bg-slate-700 hover:bg-slate-600' : 'btn-tool bg-emerald-600 hover:bg-emerald-500';
        }
    }

    private initiateWebRTCPeer(targetUserId: string) {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        this.peers[targetUserId] = pc;

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        }

        pc.ontrack = (event) => {
            let audio = document.getElementById(`audio-${targetUserId}`) as HTMLAudioElement;
            if (!audio) {
                audio = document.createElement('audio');
                audio.id = `audio-${targetUserId}`;
                audio.autoplay = true;
                document.body.appendChild(audio);
            }
            audio.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendWsMessage('webrtc-signal', { to: targetUserId, type: 'candidate', candidate: event.candidate });
            }
        };
    }

    private handleWebRTCMessage(data: any) {}

    // ==========================================
    // 🎥 3. 屏幕画板标注与全景录制 (🌟 包含橡皮擦更新)
    // ==========================================
    private initAnnotationLayer() {
        const canvas = document.createElement('canvas');
        canvas.id = 'annotation-canvas';
        canvas.className = 'fixed inset-0 z-[500] pointer-events-none';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        this.ctx = canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        canvas.addEventListener('mousemove', (e) => this.draw(e));
        window.addEventListener('mouseup', () => this.stopDrawing());
        window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
    }

    private startDrawing(e: MouseEvent) {
        this.isDrawing = true;
        // 判断是画笔起笔还是橡皮擦起笔
        const type = this.isErasing ? 'erase_start' : 'start';
        this.drawOnCanvas(e.clientX, e.clientY, type);
        this.sendWsMessage('drawSync', { roomId: this.currentRoom, x: e.clientX, y: e.clientY, type });
    }

    private draw(e: MouseEvent) {
        if (!this.isDrawing) return;
        const type = this.isErasing ? 'erase' : 'draw';
        this.drawOnCanvas(e.clientX, e.clientY, type);
        this.sendWsMessage('drawSync', { roomId: this.currentRoom, x: e.clientX, y: e.clientY, type });
    }

    private stopDrawing() { this.isDrawing = false; }

    // 🌟 核心渲染引擎：处理普通画笔、橡皮擦擦除和全屏清空
    private drawOnCanvas(x: number, y: number, type: 'start' | 'draw' | 'erase_start' | 'erase' | 'clear') {
        if (type === 'clear') {
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            return;
        }

        if (type === 'erase_start' || type === 'erase') {
            this.ctx.globalCompositeOperation = 'destination-out'; // 橡皮擦模式：剔除像素
            this.ctx.lineWidth = 25; // 橡皮擦粗一点
        } else {
            this.ctx.globalCompositeOperation = 'source-over'; // 正常画笔模式
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = '#00ffcc';
        }

        if (type === 'start' || type === 'erase_start') {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        } else {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }

    private toggleAnnotation() {
        this.annotating = !this.annotating;
        const canvas = document.getElementById('annotation-canvas')!;
        const btn = document.getElementById('draw-btn')!;
        const eraserBtn = document.getElementById('eraser-btn')!;
        const clearBtn = document.getElementById('clear-draw-btn')!;

        if (this.annotating) {
            canvas.classList.remove('pointer-events-none');
            btn.innerHTML = '❌ 关闭画板';
            btn.classList.replace('bg-slate-700', 'bg-blue-600');
            eraserBtn.classList.remove('hidden');
            clearBtn.classList.remove('hidden');
            this.showToast('🖌️ 画板开启，按住鼠标可在屏幕上做笔记');
        } else {
            canvas.classList.add('pointer-events-none');
            btn.innerHTML = '🖌️ 屏幕画板';
            btn.classList.replace('bg-blue-600', 'bg-slate-700');
            eraserBtn.classList.add('hidden');
            clearBtn.classList.add('hidden');

            // 关闭画板时，自动重置橡皮擦状态并清屏全网
            this.isErasing = false;
            eraserBtn.classList.replace('bg-blue-600', 'bg-slate-700');
            this.clearAnnotation(true);
        }
    }

    private toggleEraser() {
        this.isErasing = !this.isErasing;
        const btn = document.getElementById('eraser-btn')!;
        if (this.isErasing) {
            btn.classList.replace('bg-slate-700', 'bg-blue-600');
            this.showToast('🧽 橡皮擦已开启');
        } else {
            btn.classList.replace('bg-blue-600', 'bg-slate-700');
            this.showToast('🖌️ 画笔已开启');
        }
    }

    private clearAnnotation(sync = true) {
        this.drawOnCanvas(0, 0, 'clear');
        if (sync) {
            this.sendWsMessage('drawSync', { roomId: this.currentRoom, x: 0, y: 0, type: 'clear' });
        }
        this.showToast('🧹 画板已清空');
    }

    private toggleRecord() {
        const btn = document.getElementById('record-btn')!;
        if (!this.mediaRecorder) {
            const canvas3D = document.querySelector('canvas') as HTMLCanvasElement;
            const stream = canvas3D.captureStream(30);
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => stream.addTrack(track));
            }

            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `物理实验录像_${new Date().getTime()}.webm`;
                a.click();
            };
            this.mediaRecorder.start();
            btn.innerHTML = '⏹️ 停止录制';
            btn.classList.replace('bg-slate-700', 'bg-red-600');
            this.showToast('⏺️ 实验录制已开始');
        } else {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
            btn.innerHTML = '📹 录制实验';
            btn.classList.replace('bg-red-600', 'bg-slate-700');
        }
    }

    // ==========================================
    // 🎨 4. UI 渲染与 UGC 社区面板
    // ==========================================
    private initUI() {
        const style = `<style>.btn-tool { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: bold; color: white; cursor: pointer; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.1); }</style>`;
        document.head.insertAdjacentHTML('beforeend', style);

        // 🌟 更新 UI：在画板按钮后面插入了隐藏的“橡皮擦”和“清屏”按钮
        const collabToolbar = `
            <div id="collab-toolbar" class="fixed top-24 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-600/50 rounded-xl px-4 py-2 flex items-center space-x-3 shadow-2xl">
                <span class="text-sm font-bold text-white flex items-center"><span class="mr-2">🌍</span> <span id="room-id-display">未联机单人模式</span></span>
                <div class="h-4 w-px bg-slate-600 mx-2"></div>
                <button id="join-room-btn" class="btn-tool bg-indigo-600 hover:bg-indigo-500">创建/加入房间</button>
                <button id="voice-btn" class="btn-tool bg-slate-700 hover:bg-slate-600 hidden">🔇 语音关</button>
                <button id="draw-btn" class="btn-tool bg-slate-700 hover:bg-slate-600 hidden">🖌️ 屏幕画板</button>

                <button id="eraser-btn" class="btn-tool bg-slate-700 hover:bg-slate-600 hidden">🧽 橡皮擦</button>
                <button id="clear-draw-btn" class="btn-tool bg-red-600 hover:bg-red-500 hidden">🧹 清屏</button>

                <button id="record-btn" class="btn-tool bg-slate-700 hover:bg-slate-600 hidden">📹 录制实验</button>
                <button id="leave-room-btn" class="btn-tool bg-red-600 hover:bg-red-500 hidden">退出房间</button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', collabToolbar);

        const communityDrawer = `
            <div id="ugc-btn" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-full px-6 py-2 cursor-pointer shadow-[0_0_20px_rgba(192,38,211,0.4)] transition font-bold text-sm flex items-center">
                <span>🚀 探索开源物理社区</span>
            </div>
            <div id="ugc-panel" class="fixed inset-y-0 left-0 w-96 bg-slate-50 shadow-2xl z-[2000] transform -translate-x-full transition-transform duration-300 flex flex-col border-r border-slate-200">
                <div class="p-6 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white flex justify-between items-center">
                    <h2 class="text-xl font-black tracking-wide">Gauss Universe</h2>
                    <button id="close-ugc-btn" class="text-white hover:text-fuchsia-200 text-xl font-bold">✕</button>
                </div>
                <div class="p-4 bg-white border-b flex space-x-2">
                    <button class="flex-1 bg-fuchsia-100 text-fuchsia-700 font-bold py-2 rounded-lg text-sm border border-fuchsia-200">🔥 热门实验</button>
                    <button class="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg text-sm hover:bg-slate-200 transition">我的发布</button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-4" id="ugc-list">
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-slate-800 text-sm">如何证明磁单极子不存在？</h3>
                            <span class="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold">高斯磁场</span>
                        </div>
                        <p class="text-xs text-slate-500 mb-4 line-clamp-2">调整了一个极致视角，大家可以清晰看到不论磁偶极子怎么动，磁通量永远为零。</p>
                        <div class="flex justify-between items-center">
                            <div class="text-xs text-slate-400 flex items-center"><span class="mr-1">👤</span> 清华附中李老师</div>
                            <button class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold hover:bg-indigo-100">一键克隆 ➡️</button>
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-white border-t border-slate-200">
                    <button class="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-xl hover:bg-fuchsia-700 transition shadow-md">发布当前实验场景</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', communityDrawer);
    }

    private bindEvents() {
        document.getElementById('ugc-btn')?.addEventListener('click', () => { document.getElementById('ugc-panel')?.classList.remove('-translate-x-full'); });
        document.getElementById('close-ugc-btn')?.addEventListener('click', () => { document.getElementById('ugc-panel')?.classList.add('-translate-x-full'); });

        document.getElementById('join-room-btn')?.addEventListener('click', () => {
            const roomId = prompt('请输入你要创建或加入的 6 位房间号 (如: 888888)：');
            if (roomId && roomId.length > 0) {
                this.currentRoom = roomId;
                this.connectWebSocket();
                document.getElementById('join-room-btn')!.classList.add('hidden');
                document.getElementById('voice-btn')!.classList.remove('hidden');
                document.getElementById('draw-btn')!.classList.remove('hidden');
                document.getElementById('record-btn')!.classList.remove('hidden');
                document.getElementById('leave-room-btn')!.classList.remove('hidden');
            }
        });

        document.getElementById('leave-room-btn')?.addEventListener('click', () => {
            if(this.socket) { this.socket.disconnect(); this.socket = null; }
            this.currentRoom = null;
            if(this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
            document.getElementById('join-room-btn')!.classList.remove('hidden');

            ['voice-btn', 'draw-btn', 'eraser-btn', 'clear-draw-btn', 'record-btn', 'leave-room-btn'].forEach(id => document.getElementById(id)!.classList.add('hidden'));

            if (this.annotating) this.toggleAnnotation(); // 退出时自动关画板
            document.getElementById('room-id-display')!.innerText = `未联机单人模式`;
        });

        document.getElementById('voice-btn')?.addEventListener('click', () => this.toggleVoice());
        document.getElementById('draw-btn')?.addEventListener('click', () => this.toggleAnnotation());
        document.getElementById('eraser-btn')?.addEventListener('click', () => this.toggleEraser());
        document.getElementById('clear-draw-btn')?.addEventListener('click', () => this.clearAnnotation(true));
        document.getElementById('record-btn')?.addEventListener('click', () => this.toggleRecord());
    }

    private updateRoomUI(status: 'connecting' | 'connected' | 'disconnected') {
        const display = document.getElementById('room-id-display')!;
        if (status === 'connected') {
            display.innerHTML = `<span class="text-emerald-400">🟢 协作房间: ${this.currentRoom} (已连接)</span>`;
        } else if (status === 'connecting') {
            display.innerHTML = `<span class="text-yellow-400">⏳ 协作房间: ${this.currentRoom} (连接中...)</span>`;
        } else {
            display.innerHTML = `<span class="text-red-400">🔴 协作房间: ${this.currentRoom} (断开连接)</span>`;
        }
    }

    private showToast(msg: string) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-36 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[3000] font-bold text-sm animate-fade-in transition-all duration-300 pointer-events-none';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('opacity-0', '-translate-y-4'); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    deactivate() {
        if(this.socket) this.socket.disconnect();
    }
    uninstall() {}
}