/**
 * Math utilities for the 3jsAim game
 */

/**
 * Clamps a value between a minimum and maximum
 * @param value - The value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Generates a random number within a range
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random number in range
 */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer within a range
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Converts degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculates the distance between two 2D points
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns Distance between points
 */
export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the distance between two 3D points
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param z1 - First point Z
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @param z2 - Second point Z
 * @returns Distance between points
 */
export function distance3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalizes an angle to be between -PI and PI
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }
  while (angle < -Math.PI) {
    angle += Math.PI * 2;
  }
  return angle;
}

/**
 * Smooth step interpolation (ease in/out)
 * @param t - Interpolation factor (0-1)
 * @returns Smoothed value
 */
export function smoothStep(t: number): number {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smoother step interpolation (smoother ease in/out)
 * @param t - Interpolation factor (0-1)
 * @returns Smoothed value
 */
export function smootherStep(t: number): number {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
