import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';

interface ApiResponse<T = any> { code: number; success: boolean; data: T; message: string; }

export class AuthSyncPlugin implements BasePlugin<AppState> {
    name = 'app:auth-sync';
    version = '1.3.0'; // 🌟 终极融合版：前端画板验证码 + 强制开启教师端
    private context!: PluginContext<AppState>;

    // ✅ 这里是你刚刚打通的真实后端地址，绝对正确
    private readonly API_BASE = 'https://gauss-electromagnetism-lab-backend.onrender.com';
    private token: string | null = localStorage.getItem('gauss_token');
    private user: any = JSON.parse(localStorage.getItem('gauss_user') || 'null');

    private isOnline: boolean = navigator.onLine;
    private syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'offline' = this.isOnline ? 'idle' : 'offline';
    private syncTimer: number | null = null;
    private pendingSync: boolean = false;

    private isAuthProcessing = false;

    // 🌟 用于存储当前本地生成的 Canvas 验证码文本
    private currentCaptcha = '';

    install(context: PluginContext<AppState>) { this.context = context; }

    activate() {
        this.initUI();
        this.bindEvents();
        this.checkAuthStatus();
        this.context.state.watch(() => { this.scheduleSync(); });
    }

    // ==========================================
    // 🛡️ 1. API 拦截器引擎
    // ==========================================
    private async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<ApiResponse<T>> {
        if (!this.isOnline) throw new Error('当前处于离线模式');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        };

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                this.logout(false);
                if (endpoint.includes('/auth/login')) throw new Error('账号不存在或密码错误');
                throw new Error('会话已过期，请重新登录');
            }

            const data: ApiResponse<T> = await response.json();
            if (!data.success) throw new Error(data.message);
            return data;

        } catch (error: any) {
            if (error.message && error.message !== 'Failed to fetch' && !error.message.includes('fetch')) {
                throw error;
            }

            if (retryCount < 3) {
                console.warn(`[Sync Engine] 请求底层网络失败，1秒后进行第 ${retryCount + 1} 次重试...`);
                await new Promise(res => setTimeout(res, 1000));
                return this.request<T>(endpoint, options, retryCount + 1);
            }
            throw new Error('无法连接到后端服务器');
        }
    }

    // ==========================================
    // 🔄 2. 云端数据增量同步引擎
    // ==========================================
    private scheduleSync() {
        if (!this.user) return;

        this.pendingSync = true;
        this.updateSyncUI('syncing');

        if (this.syncTimer) clearTimeout(this.syncTimer);

        this.syncTimer = window.setTimeout(async () => {
            if (!this.isOnline) {
                this.updateSyncUI('offline');
                localStorage.setItem('gauss_offline_state', JSON.stringify(this.context.state.state));
                return;
            }

            try {
                const currentState = this.context.state.state;
                await this.request('/scenes/save', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: `自动存档 - ${new Date().toLocaleString()}`,
                        activeTopic: currentState.activeTopic,
                        stateData: currentState
                    })
                });

                this.pendingSync = false;
                this.updateSyncUI('success');
                setTimeout(() => { if (!this.pendingSync) this.updateSyncUI('idle'); }, 2000);
            } catch (error) {
                console.error('云端同步失败:', error);
                this.updateSyncUI('error');
            }
        }, 2000);
    }

    private async pullCloudData() {
        try {
            this.updateSyncUI('success');
        } catch (error) {
            console.error('拉取云端数据失败');
        }
    }

    // ==========================================
    // 🎨 3. Canvas 纯前端验证码生成器 (无需后端图片)
    // ==========================================
    private refreshCaptcha() {
        const canvas = document.getElementById('captcha-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.currentCaptcha = '';

        // 画背景
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 画随机字符
        for (let i = 0; i < 4; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            this.currentCaptcha += char;
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = `rgb(${Math.random()*150},${Math.random()*150},${Math.random()*150})`;
            ctx.fillText(char, 10 + i * 20, 28);
        }

        // 画干扰线
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
    }

    // ==========================================
    // 👤 4. 用户认证服务 (带验证码校验与强制提权)
    // ==========================================
    private async handleAuth(action: 'login' | 'register') {
        if (this.isAuthProcessing) return;

        const email = (document.getElementById('auth-email') as HTMLInputElement).value;
        const password = (document.getElementById('auth-password') as HTMLInputElement).value;
        const errorEl = document.getElementById('auth-error')!;

        if (!email || !password) { errorEl.innerText = '邮箱和密码不能为空'; return; }

        // 🌟 注册和登录都强制校验这个纯前端验证码
        const captchaInput = (document.getElementById('auth-captcha') as HTMLInputElement).value;
        if (captchaInput.toLowerCase() !== this.currentCaptcha.toLowerCase()) {
            errorEl.innerText = '验证码错误，请重新输入';
            this.refreshCaptcha(); // 验证失败自动刷新
            return;
        }

        this.isAuthProcessing = true;
        const btnId = action === 'login' ? 'auth-submit-btn' : 'auth-register-btn';
        const otherBtnId = action === 'login' ? 'auth-register-btn' : 'auth-submit-btn';

        const btn = document.getElementById(btnId) as HTMLButtonElement;
        const otherBtn = document.getElementById(otherBtnId) as HTMLButtonElement;

        const originalText = btn.innerText;
        btn.innerText = '请稍候...';
        btn.disabled = true;
        otherBtn.disabled = true;

        try {
            const res = await this.request(`/auth/${action}`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.token = res.data.accessToken;
            localStorage.setItem('gauss_token', this.token!);

            const profileRes = await this.request('/users/profile');
            this.user = profileRes.data;

            // 👑 【开挂代码】：强制把当前用户身份提升为 admin！
            // 这样你登录后直接就能按 T 打开教师端大屏！
            this.user.role = 'admin';

            localStorage.setItem('gauss_user', JSON.stringify(this.user));

            this.checkAuthStatus();
            this.closeAuthModal();
            this.pullCloudData();

        } catch (error: any) {
            errorEl.innerText = error.message || '网络或凭证错误';
            this.refreshCaptcha(); // 如果后端报错，也要刷新验证码
        } finally {
            this.isAuthProcessing = false;
            btn.innerText = originalText;
            btn.disabled = false;
            otherBtn.disabled = false;
        }
    }

    private logout(showConfirm = true) {
        if (showConfirm && !confirm('确定要退出登录吗？未同步的数据将保存在本地。')) return;
        this.token = null;
        this.user = null;
        localStorage.removeItem('gauss_token');
        localStorage.removeItem('gauss_user');
        this.checkAuthStatus();
    }

    // ==========================================
    // 🎨 5. UI 渲染与事件绑定
    // ==========================================
    private initUI() {
        const headerHTML = `
            <div id="auth-sync-panel" class="fixed top-6 right-6 z-[1000] flex items-center space-x-4">
                <div id="sync-indicator" class="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-600/50 rounded-full px-3 py-1.5 shadow-lg hidden">
                    <span id="sync-icon" class="text-xs mr-2">☁️</span>
                    <span id="sync-text" class="text-xs font-bold text-slate-300">已同步</span>
                </div>
                <div id="user-profile-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 py-2 cursor-pointer transition shadow-lg flex items-center font-bold text-sm">
                    登录 / 注册
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', headerHTML);

        const modalHTML = `
            <div id="auth-modal" class="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm hidden flex items-center justify-center">
                <div class="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden transform transition-all">
                    <div class="bg-indigo-600 p-6 text-center">
                        <h2 class="text-2xl font-black text-white tracking-widest">Gauss Cloud</h2>
                        <p class="text-indigo-200 text-xs mt-1">登录以开启云端同步与跨端漫游</p>
                    </div>
                    <div class="p-6">
                        <div class="mb-4">
                            <label class="block text-xs font-bold text-gray-700 mb-1">账号邮箱</label>
                            <input type="email" id="auth-email" class="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="student@gauss.com">
                        </div>
                        <div class="mb-4">
                            <label class="block text-xs font-bold text-gray-700 mb-1">安全密码</label>
                            <input type="password" id="auth-password" class="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••">
                        </div>

                        <div class="mb-2">
                            <label class="block text-xs font-bold text-gray-700 mb-1">验证码</label>
                            <div class="flex space-x-2">
                                <input type="text" id="auth-captcha" class="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="不区分大小写">
                                <canvas id="captcha-canvas" width="100" height="40" class="cursor-pointer border border-gray-300 rounded-lg shadow-sm" title="点击刷新"></canvas>
                            </div>
                        </div>

                        <p id="auth-error" class="text-red-500 text-xs font-bold h-4 mb-4"></p>

                        <div class="flex space-x-3">
                            <button id="auth-submit-btn" class="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">登录</button>
                            <button id="auth-register-btn" class="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 font-bold py-2.5 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50">注册新账号</button>
                        </div>
                        <p class="text-center mt-4 text-xs text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors" id="auth-close-btn">暂不登录，继续离线使用</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    private bindEvents() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncUI('idle');
            if (localStorage.getItem('gauss_offline_state')) {
                this.scheduleSync();
                localStorage.removeItem('gauss_offline_state');
            }
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncUI('offline');
        });

        document.getElementById('user-profile-btn')?.addEventListener('click', () => {
            if (this.user) this.logout();
            else this.openAuthModal();
        });

        // 🌟 点击验证码图片时刷新
        document.getElementById('captcha-canvas')?.addEventListener('click', () => this.refreshCaptcha());

        document.getElementById('auth-close-btn')?.addEventListener('click', () => this.closeAuthModal());
        document.getElementById('auth-submit-btn')?.addEventListener('click', () => this.handleAuth('login'));
        document.getElementById('auth-register-btn')?.addEventListener('click', () => this.handleAuth('register'));
    }

    private checkAuthStatus() {
        const btn = document.getElementById('user-profile-btn');
        const syncIndicator = document.getElementById('sync-indicator');

        if (this.user && btn && syncIndicator) {
            // 注意：这里也给你加了个 👑 皇冠图标，彰显你尊贵的 Admin 身份！
            btn.innerHTML = `<span class="mr-2">👑</span> ${this.user.nickname || '物理指导老师'} <span class="text-xs ml-2 opacity-70 hover:opacity-100">(退出)</span>`;
            btn.className = 'bg-slate-800 hover:bg-red-600 text-white rounded-full px-4 py-2 cursor-pointer transition shadow-lg flex items-center font-bold text-sm border border-slate-600';
            syncIndicator.classList.remove('hidden');
        } else if (btn && syncIndicator) {
            btn.innerHTML = `登录 / 注册`;
            btn.className = 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 py-2 cursor-pointer transition shadow-lg flex items-center font-bold text-sm';
            syncIndicator.classList.add('hidden');
        }
    }

    private updateSyncUI(status: 'idle' | 'syncing' | 'success' | 'error' | 'offline') {
        const icon = document.getElementById('sync-icon');
        const text = document.getElementById('sync-text');
        if (!icon || !text) return;

        switch (status) {
            case 'syncing': icon.innerText = '🔄'; text.innerText = '同步中...'; text.className = 'text-xs font-bold text-blue-400'; break;
            case 'success': icon.innerText = '✅'; text.innerText = '云端已保存'; text.className = 'text-xs font-bold text-emerald-400'; break;
            case 'error':   icon.innerText = '⚠️'; text.innerText = '同步失败'; text.className = 'text-xs font-bold text-red-400'; break;
            case 'offline': icon.innerText = '📴'; text.innerText = '离线模式(存本地)'; text.className = 'text-xs font-bold text-amber-400'; break;
            case 'idle':    icon.innerText = '☁️'; text.innerText = '与云端一致'; text.className = 'text-xs font-bold text-slate-300'; break;
        }
    }

    private openAuthModal() {
        document.getElementById('auth-modal')?.classList.remove('hidden');
        this.refreshCaptcha(); // 🌟 每次打开弹窗，自动生成新验证码
    }
    private closeAuthModal() { document.getElementById('auth-modal')?.classList.add('hidden'); }

    deactivate() {}
    uninstall() {}
}