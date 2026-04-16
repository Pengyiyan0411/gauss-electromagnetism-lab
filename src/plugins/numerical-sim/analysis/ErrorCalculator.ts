export class ErrorCalculator {
  public computeRMSE(numerical: Float32Array, analytical: Float32Array): { rmse: number, maxError: number } {
    let sumSq = 0;
    let maxAbsError = 0;
    const length = numerical.length;

    for (let i = 0; i < length; i++) {
      const diff = numerical[i] - analytical[i];
      const absError = Math.abs(diff);

      sumSq += diff * diff;
      if (absError > maxAbsError) {
        maxAbsError = absError;
      }
    }

    const rmse = Math.sqrt(sumSq / length);
    // 归一化处理计算相对误差...

    console.log(`[Error Analysis] 当前 RMSE: ${rmse.toFixed(6)}, 最大绝对误差: ${maxAbsError.toFixed(6)}`);
    return { rmse, maxError: maxAbsError };
  }
}