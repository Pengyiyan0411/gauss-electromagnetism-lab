import { BasePlugin, EventBus } from '../../core';
import { FDMCompiler } from './engines/FDM/FDMCompiler';
import { ErrorCalculator } from './analysis/ErrorCalculator';
import { DataExporter } from './exports/DataExporter';

export class NumericalSimPlugin extends BasePlugin {
  name = 'NumericalSimulation';
  private engine: FDMCompiler;
  private analyzer: ErrorCalculator;
  private exporter: DataExporter;

  constructor(private gpuDevice: GPUDevice) {
    super();
    this.engine = new FDMCompiler(gpuDevice);
    this.analyzer = new ErrorCalculator();
    this.exporter = new DataExporter();
  }

  onInstall(eventBus: EventBus) {
    // 监听参数扫描或仿真启动事件
    eventBus.on('SIMULATION_START', async (params) => {
      console.log('🚀 [NumericalSim] 开始高精度数值求解...');

      // 1. 调用 WebGPU 加速求解
      const numericalResult = await this.engine.solve(params);

      // 2. 获取基准解析解（用于对照）
      const analyticalResult = this.engine.getAnalyticalBaseline(params);

      // 3. 全链路误差分析
      const errorReport = this.analyzer.computeRMSE(numericalResult, analyticalResult);

      // 4. 将高精度结果同步给 WebGPU 渲染插件
      eventBus.emit('SIMULATION_COMPLETED', {
        fieldData: numericalResult,
        errorData: errorReport
      });
    });

    // 监听学术导出事件
    eventBus.on('EXPORT_ACADEMIC_DATA', (format) => {
      this.exporter.exportAs(format);
    });
  }
}