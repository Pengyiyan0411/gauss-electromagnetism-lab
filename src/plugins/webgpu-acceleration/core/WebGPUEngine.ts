export class WebGPUEngine {
  public device!: GPUDevice;
  public context!: GPUCanvasContext;
  public format!: GPUTextureFormat;

  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;

  // 核心 Buffers 与 BindGroups
  private chargesBuffer!: GPUBuffer;
  private vectorsBuffer!: GPUBuffer;
  private samplePointsBuffer!: GPUBuffer;
  private cameraBuffer!: GPUBuffer;
  private uniformsBuffer!: GPUBuffer;
  private geometryBuffer!: GPUBuffer;

  private computeBindGroup!: GPUBindGroup;
  private renderBindGroup!: GPUBindGroup;
  private depthTextureView!: GPUTextureView;

  private isInitialized = false;

  /**
   * 初始化 WebGPU 设备，实现优雅降级
   */
  public async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn("WebGPU is not supported on this browser.");
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return false;

    this.device = await adapter.requestDevice();
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied' // 支持与 Three.js 画布的透明叠加
    });

    // 初始化深度测试纹理，确保 3D 遮挡关系正确
    const depthTexture = this.device.createTexture({
      size: [
        canvas.clientWidth * window.devicePixelRatio || 1,
        canvas.clientHeight * window.devicePixelRatio || 1
      ],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = depthTexture.createView();

    // 监听设备丢失
    this.device.lost.then((info) => {
      console.error("WebGPU Device Lost:", info.message);
    });

    this.isInitialized = true;
    return true;
  }

  /**
   * 编译着色器与创建管线
   */
  public createPipelines(computeWGSL: string, renderWGSL: string) {
    if (!this.isInitialized) return;

    // 1. Compute Pipeline
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: computeWGSL }),
        entryPoint: 'main',
      },
    });

    // 2. Render Pipeline
    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: renderWGSL }),
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }]
        }]
      },
      fragment: {
        module: this.device.createShaderModule({ code: renderWGSL }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }}],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
    });

    // 为空状态创建缺省的绑定组，防止由于缺少 BindGroup 导致 Crash
    // 实际运行时需根据传输的数据和 Buffer 生成正式的 BindGroup
    this.computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: []
    });

    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: []
    });
  }

  /**
   * 并行渲染循环
   */
  public render(pointsCount: number, viewProjMatrix: Float32Array) {
    if (!this.isInitialized) return;

    // 更新相机矩阵
    if (this.cameraBuffer) {
        this.device.queue.writeBuffer(this.cameraBuffer, 0, viewProjMatrix);
    }

    const commandEncoder = this.device.createCommandEncoder();

    // 1. 执行 Compute Shader
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(pointsCount / 64));
    computePass.end();

    // 2. 执行 Render Shader
    const textureView = this.context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store'
      }],
      depthStencilAttachment: {
          view: this.depthTextureView,
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
      }
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);

    if (this.geometryBuffer) {
        renderPass.setVertexBuffer(0, this.geometryBuffer);
    }

    renderPass.draw(36, pointsCount, 0, 0); // 实例化渲染：一个箭头36个顶点，绘制 pointsCount 次
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  public destroy() {
    if (this.isInitialized) {
      // 释放所有的 GPU 缓存，防止内存泄漏
      if (this.chargesBuffer) this.chargesBuffer.destroy();
      if (this.vectorsBuffer) this.vectorsBuffer.destroy();
      if (this.samplePointsBuffer) this.samplePointsBuffer.destroy();
      if (this.cameraBuffer) this.cameraBuffer.destroy();
      if (this.uniformsBuffer) this.uniformsBuffer.destroy();
      if (this.geometryBuffer) this.geometryBuffer.destroy();

      this.device.destroy();
      this.isInitialized = false;
    }
  }
}
