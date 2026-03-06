/**
 * Sample a depth value from the depth map at grid coordinates.
 * Maps ASCII grid (col, row) to depth map coordinates with nearest-neighbor sampling.
 * Returns a value 0-1 where 0 = near, 1 = far.
 */
export function sampleDepthMap(
  depthMap: Float32Array,
  depthW: number,
  depthH: number,
  cellX: number,
  cellY: number,
  cols: number,
  rows: number
): number {
  // Map grid coords to depth map coords
  const dx = Math.min(depthW - 1, Math.round((cellX / cols) * depthW));
  const dy = Math.min(depthH - 1, Math.round((cellY / rows) * depthH));
  return depthMap[dy * depthW + dx];
}
