// ==========================================
// WebGPU Render Shader: 矢量场实例渲染
// ==========================================

struct CameraUniforms {
    viewProj: mat4x4<f32>,
    cameraPos: vec4<f32>,
};

struct FieldVector {
    data: vec4<f32>, // xyz: direction, w: magnitude
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<storage, read> vectors: array<FieldVector>;
@group(0) @binding(2) var<storage, read> samplePoints: array<vec4<f32>>;

struct VertexInput {
    @location(0) position: vec3<f32>, // 基础箭头几何体顶点
    @builtin(instance_index) instanceIdx: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

// 构建旋转矩阵 (将箭头沿 Y 轴旋转到指定方向)
fn alignVector(dir: vec3<f32>) -> mat3x3<f32> {
    let up = vec3<f32>(0.0, 1.0, 0.0);
    let v = cross(up, dir);
    let s = length(v);
    let c = dot(up, dir);

    if (s < 0.001) {
        if (c > 0.0) { return mat3x3<f32>(1.,0.,0., 0.,1.,0., 0.,0.,1.); }
        else { return mat3x3<f32>(1.,0.,0., 0.,-1.,0., 0.,0.,-1.); }
    }

    let vx = mat3x3<f32>(0., -v.z, v.y, v.z, 0., -v.x, -v.y, v.x, 0.);
    let i = mat3x3<f32>(1.,0.,0., 0.,1.,0., 0.,0.,1.);
    return i + vx + (vx * vx) * ((1.0 - c) / (s * s));
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;

    let field = vectors[input.instanceIdx].data;
    let basePos = samplePoints[input.instanceIdx].xyz;
    let direction = field.xyz;
    let magnitude = field.w;

    // 隐藏过小的矢量
    var scale = min(magnitude, 5.0) * 0.2;
    if (magnitude < 0.1) { scale = 0.0; }

    let rotMat = alignVector(direction);
    let worldPos = (rotMat * input.position) * scale + basePos;

    out.position = camera.viewProj * vec4<f32>(worldPos, 1.0);

    // 颜色映射 (红色代表正场，蓝色代表负场，结合强度)
    let colorIntensity = clamp(magnitude * 0.5, 0.2, 1.0);
    out.color = vec4<f32>(colorIntensity, 0.8 - colorIntensity*0.5, 0.1, 1.0);
    return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
