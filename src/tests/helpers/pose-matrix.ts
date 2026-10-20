import type { TransformMatrix } from '@/features/face-analysis/pose'

/** Builds a column-major 4×4 matrix for the given yaw (Y), pitch (X) and roll (Z), in degrees. */
export function transformMatrix(yaw = 0, pitch = 0, roll = 0): TransformMatrix {
  const [y, p, r] = [yaw, pitch, roll].map((d) => (d * Math.PI) / 180) as [number, number, number]
  const rx = [
    [1, 0, 0],
    [0, Math.cos(p), -Math.sin(p)],
    [0, Math.sin(p), Math.cos(p)],
  ]
  const ry = [
    [Math.cos(y), 0, Math.sin(y)],
    [0, 1, 0],
    [-Math.sin(y), 0, Math.cos(y)],
  ]
  const rz = [
    [Math.cos(r), -Math.sin(r), 0],
    [Math.sin(r), Math.cos(r), 0],
    [0, 0, 1],
  ]
  const mul = (a: number[][], b: number[][]) => a.map((row) => [0, 1, 2].map((j) => row.reduce((s, v, k) => s + v * b[k]![j]!, 0)))
  const m = mul(mul(rz, rx), ry) // R = Rz · Rx · Ry
  const data: number[] = []
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) data.push(row < 3 && col < 3 ? m[row]![col]! : row === col ? 1 : 0)
  return { rows: 4, columns: 4, data }
}
