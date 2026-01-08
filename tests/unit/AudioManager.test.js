/**
 * Unit tests for AudioManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AudioManager,
  SoundEffects,
  getAudioManager,
  resetAudioManager,
} from '@/game/AudioManager.js';

// Mock Web Audio API
function createMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };

  const sourceNode = {
    buffer: null,
    playbackRate: { value: 1 },
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };

  return {
    state: 'running',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({ ...gainNode })),
    createBufferSource: vi.fn(() => ({ ...sourceNode })),
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
    destination: {},
  };
}

describe('AudioManager', () => {
  let manager;
  let mockAudioContext;

  beforeEach(() => {
    resetAudioManager();
    mockAudioContext = createMockAudioContext();

    // Mock window.AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    manager = new AudioManager();
  });

  describe('constructor', () => {
    it('should initialize with default volumes', () => {
      expect(manager.masterVolume).toBe(1.0);
      expect(manager.sfxVolume).toBe(0.8);
      expect(manager.musicVolume).toBe(0.5);
    });

    it('should accept custom volumes', () => {
      const custom = new AudioManager({
        masterVolume: 0.5,
        sfxVolume: 0.3,
        musicVolume: 0.2,
      });
      expect(custom.masterVolume).toBe(0.5);
      expect(custom.sfxVolume).toBe(0.3);
      expect(custom.musicVolume).toBe(0.2);
    });

    it('should not be initialized', () => {
      expect(manager.isInitialized).toBe(false);
    });
  });

  describe('init', () => {
    it('should create audio context', async () => {
      const result = await manager.init();
      expect(result).toBe(true);
      expect(manager.isInitialized).toBe(true);
    });

    it('should create gain nodes', async () => {
      await manager.init();
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
    });

    it('should emit initialized event', async () => {
      const callback = vi.fn();
      manager.on('initialized', callback);
      await manager.init();
      expect(callback).toHaveBeenCalled();
    });

    it('should not re-initialize', async () => {
      await manager.init();
      const calls = mockAudioContext.createGain.mock.calls.length;
      await manager.init();
      expect(mockAudioContext.createGain.mock.calls.length).toBe(calls);
    });

    it('should return false if Web Audio not supported', async () => {
      delete global.AudioContext;
      delete global.webkitAudioContext;
      const newManager = new AudioManager();
      const result = await newManager.init();
      expect(result).toBe(false);
    });
  });

  describe('resume/suspend', () => {
    beforeEach(async () => {
      await manager.init();
    });

    it('should resume suspended context', async () => {
      mockAudioContext.state = 'suspended';
      await manager.resume();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should suspend running context', async () => {
      await manager.suspend();
      expect(mockAudioContext.suspend).toHaveBeenCalled();
    });
  });

  describe('loadSound', () => {
    beforeEach(async () => {
      await manager.init();
    });

    it('should load sound', async () => {
      const result = await manager.loadSound('test', 'test.mp3');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('test.mp3');
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('should return false if not initialized', async () => {
      const newManager = new AudioManager();
      const result = await newManager.loadSound('test', 'test.mp3');
      expect(result).toBe(false);
    });

    it('should create sound pool', async () => {
      await manager.loadSound('test', 'test.mp3', { poolSize: 5 });
      expect(manager._soundPools.has('test')).toBe(true);
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await manager.init();
      await manager.loadSound('test', 'test.mp3');
    });

    it('should play sound', () => {
      const result = manager.play('test');
      expect(result).not.toBeNull();
    });

    it('should return null for unloaded sound', () => {
      const result = manager.play('unknown');
      expect(result).toBeNull();
    });

    it('should return null when muted', () => {
      manager.mute();
      const result = manager.play('test');
      expect(result).toBeNull();
    });

    it('should emit play event', () => {
      const callback = vi.fn();
      manager.on('play', callback);
      manager.play('test');
      expect(callback).toHaveBeenCalledWith({
        name: 'test',
        options: {},
      });
    });

    it('should return control object', () => {
      const control = manager.play('test');
      expect(typeof control.stop).toBe('function');
      expect(typeof control.setVolume).toBe('function');
    });
  });

  describe('volume controls', () => {
    beforeEach(async () => {
      await manager.init();
    });

    it('should set master volume', () => {
      manager.setMasterVolume(0.5);
      expect(manager.masterVolume).toBe(0.5);
    });

    it('should clamp volume to 0-1', () => {
      manager.setMasterVolume(2);
      expect(manager.masterVolume).toBe(1);
      manager.setMasterVolume(-1);
      expect(manager.masterVolume).toBe(0);
    });

    it('should set sfx volume', () => {
      manager.setSfxVolume(0.3);
      expect(manager.sfxVolume).toBe(0.3);
    });

    it('should set music volume', () => {
      manager.setMusicVolume(0.7);
      expect(manager.musicVolume).toBe(0.7);
    });
  });

  describe('mute controls', () => {
    beforeEach(async () => {
      await manager.init();
    });

    it('should mute', () => {
      const callback = vi.fn();
      manager.on('muted', callback);
      manager.mute();
      expect(manager.isMuted).toBe(true);
      expect(callback).toHaveBeenCalled();
    });

    it('should unmute', () => {
      manager.mute();
      const callback = vi.fn();
      manager.on('unmuted', callback);
      manager.unmute();
      expect(manager.isMuted).toBe(false);
      expect(callback).toHaveBeenCalled();
    });

    it('should toggle mute', () => {
      manager.toggleMute();
      expect(manager.isMuted).toBe(true);
      manager.toggleMute();
      expect(manager.isMuted).toBe(false);
    });
  });

  describe('music', () => {
    beforeEach(async () => {
      await manager.init();
      await manager.loadSound('music', 'music.mp3');
    });

    it('should play music', () => {
      const result = manager.playMusic('music');
      expect(result).toBe(true);
    });

    it('should emit musicStart event', () => {
      const callback = vi.fn();
      manager.on('musicStart', callback);
      manager.playMusic('music');
      expect(callback).toHaveBeenCalledWith({ name: 'music' });
    });

    it('should stop music', () => {
      manager.playMusic('music');
      const callback = vi.fn();
      manager.on('musicStop', callback);
      manager.stopMusic();
      expect(callback).toHaveBeenCalled();
    });

    it('should return false for unloaded music', () => {
      const result = manager.playMusic('unknown');
      expect(result).toBe(false);
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      await manager.init();
    });

    it('should close audio context', () => {
      manager.destroy();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(manager.isInitialized).toBe(false);
    });

    it('should clear buffers', () => {
      manager._buffers.set('test', {});
      manager.destroy();
      expect(manager._buffers.size).toBe(0);
    });
  });
});

describe('SoundEffects', () => {
  it('should have common sound effects defined', () => {
    expect(SoundEffects.SHOOT).toBeDefined();
    expect(SoundEffects.HIT_CIRCLE).toBeDefined();
    expect(SoundEffects.MISS).toBeDefined();
    expect(SoundEffects.COMBO_UP).toBeDefined();
    expect(SoundEffects.GAME_START).toBeDefined();
    expect(SoundEffects.GAME_END).toBeDefined();
  });
});

describe('Global AudioManager', () => {
  beforeEach(() => {
    resetAudioManager();
  });

  it('should return same instance', () => {
    const a1 = getAudioManager();
    const a2 = getAudioManager();
    expect(a1).toBe(a2);
  });

  it('should reset properly', () => {
    const a1 = getAudioManager();
    resetAudioManager();
    const a2 = getAudioManager();
    expect(a2).not.toBe(a1);
  });
});
