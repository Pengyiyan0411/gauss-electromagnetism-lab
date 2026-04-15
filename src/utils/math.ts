/**
 * 物理引擎 3D 数学基础工具库
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// 向量加法
export const addVectors = (v1: Vector3D, v2: Vector3D): Vector3D => {
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
};

// 向量减法 (v1 - v2)
export const subVectors = (v1: Vector3D, v2: Vector3D): Vector3D => {
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
};

// 标量乘法
export const multiplyScalar = (v: Vector3D, scalar: number): Vector3D => {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
};

// 计算向量长度 (模)
export const vectorLength = (v: Vector3D): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
};

// 两点间距离
export const distance3D = (p1: Vector3D, p2: Vector3D): number => {
  return vectorLength(subVectors(p1, p2));
};

// 向量归一化 (计算方向)
export const normalize = (v: Vector3D): Vector3D => {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return multiplyScalar(v, 1 / len);
};

// 向量点乘 (Dot Product - 用于算电通量 Φ = E · A)
export const dotProduct = (v1: Vector3D, v2: Vector3D): number => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

// 向量叉乘 (Cross Product - 用于坡印廷矢量 S = E × B)
export const crossProduct = (v1: Vector3D, v2: Vector3D): Vector3D => {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
};

// 平滑插值 (Lerp - 用于手势平滑过度)
export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};