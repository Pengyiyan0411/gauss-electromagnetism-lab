import { AppState } from '../../types';

export class PromptBuilder {
    private static SYSTEM_PROMPT = `你是一位专业的高中及大学物理 AI 助教。
你的任务是：解答学生的电磁学问题，分析当前实验参数，并给出准确的物理原理解释。
规则：
1. 绝对不回答与物理、电磁学无关的问题。
2. 结合学生当前的【实验状态】和【掌握率】提供个性化指导。
3. 语气要鼓励、耐心，解释要通俗易懂，多用生活中的类比。
4. 使用 Markdown 格式输出，公式使用 LaTeX (例如 $\\Phi_B$)。`;

    static build(query: string, state: AppState, mastery: number): string {
        // 将微内核的当前状态转化为自然语言上下文
        const context = `
【当前实验室状态】
- 正在探索的模块：${state.activeTopic}
- 核心参数1 (如半径/面积等)：${state.radius || state.coilArea || 'N/A'}
- 核心参数2 (如电荷量/角速度)：${state.coilOmega || state.magnetStrength || 'N/A'}
- 学生当前知识点掌握率：${(mastery * 100).toFixed(1)}%
`;

        // ChatML 格式拼接 (适配 Qwen/Llama)
        return `<|im_start|>system\n${this.SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${context}\n学生提问：${query}<|im_end|>\n<|im_start|>assistant\n`;
    }
}
