import { BasePlugin, PluginContext } from '../../core/plugin-manager';
import { AppState } from '../../types';
import { PromptBuilder } from './prompt-builder';

export class AiAssistantPlugin implements BasePlugin<AppState> {
    name = 'app:ai-assistant';
    version = '2.1.0'; // 升级：支持 Markdown、LaTeX 公式与多轮修复
    private context!: PluginContext<AppState>;
    private isGenerating = false;

    private apiKey = 'sk-0b591977926c4204a1e1284a494689fb';
    private baseUrl = 'https://api.deepseek.com/v1';
    private modelName = 'deepseek-chat';

    private chatHistory: { role: string, content: string }[] = [];

    install(context: PluginContext<AppState>) { this.context = context; }

    activate() {
        this.loadMarkdownEngine();
        this.initUI();
        if (!this.apiKey) {
            this.showConfigPanel();
        } else {
            this.showChatPanel();
        }
    }

    // 动态加载 Markdown 解析引擎
    private loadMarkdownEngine() {
        if ((window as any).marked) return;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        document.head.appendChild(script);
    }

    private initUI() {
        const uiHTML = `
            <div id="ai-chat-btn" class="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition transform hover:scale-110 z-[1000]">
                <span class="text-2xl">🤖</span>
            </div>

            <div id="ai-chat-panel" class="fixed bottom-24 right-6 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-indigo-100 hidden flex-col z-[1000] overflow-hidden" style="height: 500px;">
                <div class="bg-indigo-600 p-4 flex justify-between items-center text-white">
                    <h3 class="font-bold flex items-center"><span class="mr-2">☁️</span> 云端 AI 助教</h3>
                    <div class="flex space-x-3">
                        <button id="ai-settings-btn" class="text-indigo-200 hover:text-white" title="API 设置">⚙️</button>
                        <button id="ai-close-btn" class="text-indigo-200 hover:text-white">✕</button>
                    </div>
                </div>

                <div id="ai-config-screen" class="flex-1 flex flex-col p-6 overflow-y-auto hidden">
                    <h4 class="font-bold text-gray-800 mb-4 text-center border-b pb-2">接口配置</h4>
                    <label class="text-xs text-gray-600 font-bold mb-1">API Key (密钥)</label>
                    <input type="password" id="cfg-api-key" value="${this.apiKey}" class="w-full px-3 py-2 mb-4 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500">
                    <button id="ai-save-cfg-btn" class="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">保存并进入聊天</button>
                </div>

                <div id="ai-chat-screen" class="hidden flex-col h-full">
                    <div id="ai-msg-list" class="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-slate-50/50">
                        <div class="bg-white p-3 rounded-lg rounded-tl-none text-gray-800 max-w-[85%] border border-gray-200 shadow-sm">
                            你好！我是极速云端 AI 助教。我的智商很高，你可以随时问我任何电磁学问题，或者让我帮你分析当前的实验场景。
                        </div>
                    </div>
                    <div class="p-3 bg-white border-t border-gray-200 flex items-center">
                        <input type="text" id="ai-input" class="flex-1 px-3 py-2 bg-gray-100 border-transparent focus:bg-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="输入您的问题...">
                        <button id="ai-send-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 font-bold shadow-sm">发送</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiHTML);

        document.getElementById('ai-chat-btn')?.addEventListener('click', () => {
            document.getElementById('ai-chat-panel')?.classList.toggle('hidden');
            document.getElementById('ai-chat-panel')?.classList.toggle('flex');
        });
        document.getElementById('ai-close-btn')?.addEventListener('click', () => {
            document.getElementById('ai-chat-panel')?.classList.add('hidden');
            document.getElementById('ai-chat-panel')?.classList.remove('flex');
        });
        document.getElementById('ai-settings-btn')?.addEventListener('click', () => this.showConfigPanel());

        document.getElementById('ai-save-cfg-btn')?.addEventListener('click', () => {
            this.apiKey = (document.getElementById('cfg-api-key') as HTMLInputElement).value.trim();
            if (this.apiKey) this.showChatPanel();
        });

        document.getElementById('ai-send-btn')?.addEventListener('click', () => this.handleSend());
        document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    private showConfigPanel() {
        document.getElementById('ai-chat-screen')?.classList.add('hidden');
        document.getElementById('ai-chat-screen')?.classList.remove('flex');
        document.getElementById('ai-config-screen')?.classList.remove('hidden');
        document.getElementById('ai-config-screen')?.classList.add('flex');
    }

    private showChatPanel() {
        document.getElementById('ai-config-screen')?.classList.add('hidden');
        document.getElementById('ai-config-screen')?.classList.remove('flex');
        document.getElementById('ai-chat-screen')?.classList.remove('hidden');
        document.getElementById('ai-chat-screen')?.classList.add('flex');
    }

    private async handleSend() {
        if (!this.apiKey) { alert("请先配置 API Key"); this.showConfigPanel(); return; }
        if (this.isGenerating) return;

        const inputEl = document.getElementById('ai-input') as HTMLInputElement;
        const query = inputEl.value.trim();
        if (!query) return;

        inputEl.value = '';
        this.appendMessage('user', query);

        const systemPrompt = PromptBuilder.build(query, this.context.state.state, 0.8);

        this.isGenerating = true;
        this.createAssistantMessageBubble();

        try {
            await this.fetchAIStream(systemPrompt, query);
        } catch (error: any) {
            this.appendMessageChunk(`\n\n[网络错误]: ${error.message}。请检查您的 API Key 和网络连接。`);
        } finally {
            this.isGenerating = false; // 确保彻底释放锁定，允许下一轮对话
        }
    }

    private async fetchAIStream(systemPrompt: string, userQuery: string) {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.chatHistory.slice(-4),
            { role: 'user', content: userQuery }
        ];

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
            body: JSON.stringify({ model: this.modelName, messages: messages, stream: true, temperature: 0.3 })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullReply = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content;
                            if (content) {
                                fullReply += content;
                                this.appendMessageChunk(content);
                            }
                        } catch(e) {}
                    }
                }
            }
        }

        // --- 核心修复：渲染 Markdown 与 LaTeX 公式 ---
        if (this.currentAssistantBubble) {
            let finalHtml = fullReply.replace(/<\|im_end\|>/g, ''); // 剔除大模型可能泄漏的控制符
            if ((window as any).marked) {
                finalHtml = (window as any).marked.parse(finalHtml);
            }
            this.currentAssistantBubble.innerHTML = finalHtml;

            // 触发 MathJax 渲染公式
            if ((window as any).MathJax && typeof (window as any).MathJax.typesetPromise === 'function') {
                (window as any).MathJax.typesetPromise([this.currentAssistantBubble]).catch(() => {});
            }
        }

        this.chatHistory.push({ role: 'user', content: userQuery });
        this.chatHistory.push({ role: 'assistant', content: fullReply });
    }

    private appendMessage(role: 'user' | 'assistant', text: string) {
        const list = document.getElementById('ai-msg-list');
        if (role === 'user') {
            list?.insertAdjacentHTML('beforeend', `<div class="bg-indigo-600 text-white p-3 rounded-lg rounded-tr-none max-w-[85%] self-end ml-auto shadow-sm">${text}</div>`);
        }
        list?.scrollTo(0, list.scrollHeight);
    }

    private currentAssistantBubble: HTMLElement | null = null;

    private createAssistantMessageBubble() {
        const list = document.getElementById('ai-msg-list');
        list?.insertAdjacentHTML('beforeend', `<div class="ai-reply text-gray-800 bg-white p-3 rounded-lg rounded-tl-none max-w-[85%] border border-gray-200 shadow-sm leading-relaxed whitespace-pre-wrap"></div>`);
        const bubbles = list?.querySelectorAll('.ai-reply');
        if (bubbles) {
            this.currentAssistantBubble = bubbles[bubbles.length - 1] as HTMLElement;
        }
    }

    private appendMessageChunk(chunk: string) {
        if (this.currentAssistantBubble) {
            this.currentAssistantBubble.innerText += chunk;
            const list = document.getElementById('ai-msg-list');
            list?.scrollTo(0, list.scrollHeight);
        }
    }

    deactivate() {
        document.getElementById('ai-chat-btn')?.remove();
        document.getElementById('ai-chat-panel')?.remove();
    }

    uninstall() {}
}