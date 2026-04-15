export class BKTModel {
  // 模型超参数设定 (针对物理学理解)
  private P_INIT = 0.20; // 初始掌握概率
  private P_TRANSIT = 0.15; // 学习一题后掌握的转移概率
  private P_GUESS = 0.20; // 不懂但猜对的概率 (四选一)
  private P_SLIP = 0.10; // 懂但做错的失误概率

  /**
   * 基于用户的答题结果，更新其知识点掌握率
   * @param currentP 当前掌握概率 P(L_t-1)
   * @param isCorrect 答题是否正确
   * @returns 新的掌握概率 P(L_t)
   */
  public updateProbability(currentP: number | null, isCorrect: boolean): number {
    const pL = currentP !== null ? currentP : this.P_INIT;

    let pLObs: number; // 观察到正确/错误后的后验概率 P(L_t-1 | Obs)

    if (isCorrect) {
      // 答对了：可能是真懂了，也可能是猜的
      const pObs = pL * (1 - this.P_SLIP) + (1 - pL) * this.P_GUESS;
      pLObs = (pL * (1 - this.P_SLIP)) / pObs;
    } else {
      // 答错了：可能是真不懂，也可能是粗心失误
      const pObs = pL * this.P_SLIP + (1 - pL) * (1 - this.P_GUESS);
      pLObs = (pL * this.P_SLIP) / pObs;
    }

    // 计算加上学习转移概率后的新掌握率
    const newPL = pLObs + (1 - pLObs) * this.P_TRANSIT;

    // 防溢出保护
    return Math.max(0.01, Math.min(0.99, newPL));
  }
}
