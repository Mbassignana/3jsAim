/**
 * Test setup file for Vitest
 * Configures the testing environment with browser-like globals
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock requestAnimationFrame for tests
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(() => callback(performance.now()), 16);
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock pointer lock API
Object.defineProperty(document, 'pointerLockElement', {
  value: null,
  writable: true,
});

document.body.requestPointerLock = vi.fn();
document.exitPointerLock = vi.fn();

// Mock performance.now() for consistent timing
const mockPerformance = {
  now: vi.fn(() => Date.now()),
};
global.performance = mockPerformance;

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn(function (contextType) {
  if (contextType === '2d') {
    return {
      canvas: this,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  }
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: this,
      getExtension: vi.fn(),
      createBuffer: vi.fn(),
      createProgram: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      getUniformLocation: vi.fn(() => ({})),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      blendFunc: vi.fn(),
      depthFunc: vi.fn(),
      cullFace: vi.fn(),
      frontFace: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      uniform3f: vi.fn(),
      uniform4f: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      activeTexture: vi.fn(),
      uniform1i: vi.fn(),
      getParameter: vi.fn(() => 1024),
    };
  }
  return null;
});

// Clean up mocks after each test
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
