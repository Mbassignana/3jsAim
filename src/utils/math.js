/**
 * Math utilities for the 3jsAim game
 */

/**
 * Clamps a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Generates a random number within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random number in range
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in range
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculates the distance between two 2D points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance between points
 */
export function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the distance between two 3D points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @param {number} z2 - Second point Z
 * @returns {number} Distance between points
 */
export function distance3D(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalizes an angle to be between -PI and PI
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle
 */
export function normalizeAngle(angle) {
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
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Smoothed value
 */
export function smoothStep(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smoother step interpolation (smoother ease in/out)
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Smoothed value
 */
export function smootherStep(t) {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
