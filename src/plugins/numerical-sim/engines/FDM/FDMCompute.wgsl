// FDMCompute.wgsl
// 雅可比迭代求解 2D 泊松方程

struct SimParams {
  gridSize: vec2<u32>,
  deltaSpace: f32, // 空间步长 dx
  epsilon: f32,    // 介电常数
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read> chargeGrid: array<f32>;      // 源电荷密度 rho
@group(0) @binding(2) var<storage, read> phiOld: array<f32>;          // 上一步电势
@group(0) @binding(3) var<storage, read_write> phiNew: array<f32>;    // 计算后的新电势

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  let width = params.gridSize.x;
  let height = params.gridSize.y;

  // 边界条件处理（狄利克雷边界，默认无穷远处边界为0）
  if (x == 0u || x >= width - 1u || y == 0u || y >= height - 1u) {
    let index = y * width + x;
    phiNew[index] = 0.0;
    return;
  }

  let idx = y * width + x;
  let idx_up = (y - 1u) * width + x;
  let idx_down = (y + 1u) * width + x;
  let idx_left = y * width + (x - 1u);
  let idx_right = y * width + (x + 1u);

  // 中心差分公式: phi(i,j) = 1/4 * (phi(i+1,j) + phi(i-1,j) + phi(i,j+1) + phi(i,j-1)) + (dx^2 * rho(i,j)) / (4 * epsilon)
  let sum_neighbors = phiOld[idx_up] + phiOld[idx_down] + phiOld[idx_left] + phiOld[idx_right];
  let source_term = (params.deltaSpace * params.deltaSpace * chargeGrid[idx]) / params.epsilon;

  phiNew[idx] = 0.25 * (sum_neighbors + source_term);
}