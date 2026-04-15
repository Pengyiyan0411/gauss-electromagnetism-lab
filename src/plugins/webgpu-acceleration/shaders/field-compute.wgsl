// ==========================================
// WebGPU Compute Shader: 电磁场并行计算
// ==========================================

struct Charge {
    pos: vec4<f32>, // xyz: 位置, w: 电荷量/磁强度 q
};

struct Uniforms {
    chargeCount: u32,
    fieldType: u32, // 0: 电场, 1: 磁场
    padding1: u32,
    padding2: u32,
};

// 场矢量数据 (xyz: 场方向, w: 场强大小)
struct FieldVector {
    data: vec4<f32>,
};

@group(0) @binding(0) var<storage, read> charges: array<Charge>;
@group(0) @binding(1) var<storage, read_write> vectors: array<FieldVector>;
@group(0) @binding(2) var<storage, read> samplePoints: array<vec4<f32>>; // 采样点坐标
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

const EPSILON: f32 = 0.01; // 防止除以0导致奇点爆炸
const K: f32 = 50.0;       // 视觉放大常数

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&vectors)) {
        return; // 越界保护
    }

    let p = samplePoints[index].xyz;
    var totalField = vec3<f32>(0.0, 0.0, 0.0);

    // 遍历所有场源，叠加电场/磁场
    for (var i = 0u; i < uniforms.chargeCount; i = i + 1u) {
        let chargePos = charges[i].pos.xyz;
        let q = charges[i].pos.w;

        let rVec = p - chargePos;
        let rSq = dot(rVec, rVec);

        if (rSq > EPSILON) {
            if (uniforms.fieldType == 0u) {
                // 静电场: E = k * q / r^2 * (r_vec / r)
                let eMag = K * q / rSq;
                totalField += normalize(rVec) * eMag;
            } else {
                // 磁场 (磁偶极子模型)
                // 磁偶极矩 m 假设沿 Y 轴方向，大小正比于 q
                let m = vec3<f32>(0.0, q * 10.0, 0.0);
                let rMag = sqrt(rSq);
                let mDotR = dot(m, rVec);

                // B(r) = (mu0/4pi) * (3(m.r)r/r^5 - m/r^3)
                let term1 = (3.0 * mDotR / pow(rMag, 5.0)) * rVec;
                let term2 = m / pow(rMag, 3.0);
                totalField += (term1 - term2);
            }
        }
    }

    let magnitude = length(totalField);
    var direction = vec3<f32>(0.0, 1.0, 0.0);
    if (magnitude > 0.001) {
        direction = totalField / magnitude;
    }

    // 结果写回 Storage Buffer，供渲染着色器使用
    vectors[index].data = vec4<f32>(direction, magnitude);
}
