/**
 * AudioManager - Handles game audio using Web Audio API
 * Supports sound effects, music, volume controls, and audio pooling
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { ObjectPool } from '../utils/ObjectPool.js';

/**
 * @typedef {Object} SoundConfig
 * @property {string} src - Audio file URL
 * @property {number} [volume=1.0] - Default volume (0-1)
 * @property {boolean} [loop=false] - Whether to loop
 * @property {number} [poolSize=1] - Number of concurrent instances
 */

export const SoundEffects = {
  SHOOT: 'shoot',
  HIT_CIRCLE: 'hit_circle',
  HIT_NPC: 'hit_npc',
  MISS: 'miss',
  COMBO_UP: 'combo_up',
  COMBO_BREAK: 'combo_break',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  MENU_SELECT: 'menu_select',
  MENU_HOVER: 'menu_hover',
  TIMER_TICK: 'timer_tick',
  TIMER_WARNING: 'timer_warning',
};

export class AudioManager extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.masterVolume=1.0]
   * @param {number} [options.sfxVolume=0.8]
   * @param {number} [options.musicVolume=0.5]
   */
  constructor(options = {}) {
    super();

    this._masterVolume = options.masterVolume ?? 1.0;
    this._sfxVolume = options.sfxVolume ?? 0.8;
    this._musicVolume = options.musicVolume ?? 0.5;

    /** @type {AudioContext|null} */
    this._context = null;

    /** @type {GainNode|null} */
    this._masterGain = null;

    /** @type {GainNode|null} */
    this._sfxGain = null;

    /** @type {GainNode|null} */
    this._musicGain = null;

    /** @type {Map<string, AudioBuffer>} */
    this._buffers = new Map();

    /** @type {Map<string, ObjectPool>} */
    this._soundPools = new Map();

    /** @type {AudioBufferSourceNode|null} */
    this._currentMusic = null;

    this._muted = false;
    this._initialized = false;
    this._suspended = false;
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._initialized) {
      return true;
    }

    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return false;
      }

      this._context = new AudioContextClass();

      // Create gain nodes for volume control
      this._masterGain = this._context.createGain();
      this._sfxGain = this._context.createGain();
      this._musicGain = this._context.createGain();

      // Connect: sources -> sfx/music gain -> master gain -> destination
      this._sfxGain.connect(this._masterGain);
      this._musicGain.connect(this._masterGain);
      this._masterGain.connect(this._context.destination);

      // Set initial volumes
      this._updateVolumes();

      this._initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  /**
   * Resume audio context if suspended (required after user interaction)
   * @returns {Promise<void>}
   */
  async resume() {
    if (!this._context) {
      return;
    }

    if (this._context.state === 'suspended') {
      await this._context.resume();
      this._suspended = false;
      this.emit('resumed');
    }
  }

  /**
   * Suspend audio context
   * @returns {Promise<void>}
   */
  async suspend() {
    if (!this._context) {
      return;
    }

    if (this._context.state === 'running') {
      await this._context.suspend();
      this._suspended = true;
      this.emit('suspended');
    }
  }

  /**
   * Load a sound effect
   * @param {string} name - Sound effect name
   * @param {string} src - Audio file URL
   * @param {Object} [options]
   * @param {number} [options.poolSize=3] - Number of concurrent instances
   * @returns {Promise<boolean>}
   */
  async loadSound(name, src, options = {}) {
    if (!this._context) {
      console.warn('Audio not initialized');
      return false;
    }

    try {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this._context.decodeAudioData(arrayBuffer);

      this._buffers.set(name, audioBuffer);

      // Create pool for this sound
      const poolSize = options.poolSize ?? 3;
      this._soundPools.set(
        name,
        new ObjectPool({
          factory: () => this._createSoundSource(name),
          reset: (source) => {
            if (source.playing) {
              source.stop();
            }
          },
          initialSize: poolSize,
          maxSize: poolSize * 2,
        })
      );

      return true;
    } catch (error) {
      console.warn(`Failed to load sound "${name}":`, error);
      return false;
    }
  }

  /**
   * Create a sound source node
   * @param {string} name - Sound effect name
   * @returns {Object}
   */
  _createSoundSource(name) {
    return {
      name,
      node: null,
      playing: false,
      stop() {
        if (this.node && this.playing) {
          try {
            this.node.stop();
          } catch (e) {
            // Already stopped
          }
          this.playing = false;
        }
      },
    };
  }

  /**
   * Play a sound effect
   * @param {string} name - Sound effect name
   * @param {Object} [options]
   * @param {number} [options.volume=1.0] - Volume multiplier
   * @param {number} [options.rate=1.0] - Playback rate
   * @param {boolean} [options.loop=false] - Loop sound
   * @returns {Object|null} Sound instance for control
   */
  play(name, options = {}) {
    if (!this._context || !this._initialized || this._muted) {
      return null;
    }

    const buffer = this._buffers.get(name);
    if (!buffer) {
      console.warn(`Sound "${name}" not loaded`);
      return null;
    }

    const pool = this._soundPools.get(name);
    if (!pool) {
      return null;
    }

    const source = pool.acquire();
    if (!source) {
      return null;
    }

    const volume = options.volume ?? 1.0;
    const rate = options.rate ?? 1.0;
    const loop = options.loop ?? false;

    // Create buffer source
    const bufferSource = this._context.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.playbackRate.value = rate;
    bufferSource.loop = loop;

    // Create gain for individual volume control
    const gainNode = this._context.createGain();
    gainNode.gain.value = volume;

    // Connect: source -> gain -> sfx gain
    bufferSource.connect(gainNode);
    gainNode.connect(this._sfxGain);

    // Track state
    source.node = bufferSource;
    source.playing = true;

    // Handle completion
    bufferSource.onended = () => {
      source.playing = false;
      pool.release(source);
    };

    // Play
    bufferSource.start(0);

    this.emit('play', { name, options });

    return {
      stop: () => {
        source.stop();
        pool.release(source);
      },
      setVolume: (v) => {
        gainNode.gain.value = v;
      },
    };
  }

  /**
   * Play music
   * @param {string} name - Music track name
   * @param {Object} [options]
   * @param {number} [options.fadeIn=0] - Fade in duration in seconds
   * @returns {boolean}
   */
  playMusic(name, options = {}) {
    if (!this._context || !this._initialized) {
      return false;
    }

    // Stop current music
    this.stopMusic(options.fadeIn > 0 ? 0.5 : 0);

    const buffer = this._buffers.get(name);
    if (!buffer) {
      console.warn(`Music "${name}" not loaded`);
      return false;
    }

    const bufferSource = this._context.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = true;

    bufferSource.connect(this._musicGain);

    // Handle fade in
    if (options.fadeIn > 0) {
      this._musicGain.gain.setValueAtTime(0, this._context.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(
        this._musicVolume,
        this._context.currentTime + options.fadeIn
      );
    }

    bufferSource.start(0);
    this._currentMusic = bufferSource;

    this.emit('musicStart', { name });
    return true;
  }

  /**
   * Stop music
   * @param {number} [fadeOut=0] - Fade out duration in seconds
   */
  stopMusic(fadeOut = 0) {
    if (!this._currentMusic || !this._context) {
      return;
    }

    if (fadeOut > 0) {
      this._musicGain.gain.linearRampToValueAtTime(
        0,
        this._context.currentTime + fadeOut
      );
      setTimeout(() => {
        if (this._currentMusic) {
          try {
            this._currentMusic.stop();
          } catch (e) {
            // Already stopped
          }
          this._currentMusic = null;
        }
      }, fadeOut * 1000);
    } else {
      try {
        this._currentMusic.stop();
      } catch (e) {
        // Already stopped
      }
      this._currentMusic = null;
    }

    this.emit('musicStop');
  }

  // Volume controls

  /**
   * Set master volume
   * @param {number} volume - Volume (0-1)
   */
  setMasterVolume(volume) {
    this._masterVolume = Math.max(0, Math.min(1, volume));
    this._updateVolumes();
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume (0-1)
   */
  setSfxVolume(volume) {
    this._sfxVolume = Math.max(0, Math.min(1, volume));
    this._updateVolumes();
  }

  /**
   * Set music volume
   * @param {number} volume - Volume (0-1)
   */
  setMusicVolume(volume) {
    this._musicVolume = Math.max(0, Math.min(1, volume));
    this._updateVolumes();
  }

  /**
   * Update gain node values
   */
  _updateVolumes() {
    if (!this._initialized) {
      return;
    }

    const effectiveVolume = this._muted ? 0 : this._masterVolume;
    this._masterGain.gain.setValueAtTime(effectiveVolume, this._context.currentTime);
    this._sfxGain.gain.setValueAtTime(this._sfxVolume, this._context.currentTime);
    this._musicGain.gain.setValueAtTime(this._musicVolume, this._context.currentTime);
  }

  /**
   * Get master volume
   * @returns {number}
   */
  get masterVolume() {
    return this._masterVolume;
  }

  /**
   * Get SFX volume
   * @returns {number}
   */
  get sfxVolume() {
    return this._sfxVolume;
  }

  /**
   * Get music volume
   * @returns {number}
   */
  get musicVolume() {
    return this._musicVolume;
  }

  // Mute controls

  /**
   * Mute all audio
   */
  mute() {
    this._muted = true;
    this._updateVolumes();
    this.emit('muted');
  }

  /**
   * Unmute all audio
   */
  unmute() {
    this._muted = false;
    this._updateVolumes();
    this.emit('unmuted');
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * Check if muted
   * @returns {boolean}
   */
  get isMuted() {
    return this._muted;
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopMusic();

    // Stop all pooled sounds
    this._soundPools.forEach((pool) => pool.releaseAll());

    if (this._context) {
      this._context.close();
      this._context = null;
    }

    this._buffers.clear();
    this._soundPools.clear();
    this._initialized = false;
  }
}

// Singleton instance
let audioManagerInstance = null;

/**
 * Get the global audio manager instance
 * @returns {AudioManager}
 */
export function getAudioManager() {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}

/**
 * Reset the global audio manager
 */
export function resetAudioManager() {
  if (audioManagerInstance) {
    audioManagerInstance.destroy();
    audioManagerInstance.removeAllListeners();
  }
  audioManagerInstance = null;
}

export default AudioManager;
