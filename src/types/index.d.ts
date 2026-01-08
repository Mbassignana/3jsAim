/**
 * Global type definitions for 3jsAim
 */

// ==========================================================================
// Vector Types
// ==========================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ==========================================================================
// Entity Types
// ==========================================================================

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Position3D;
  rotation?: Rotation3D;
  scale?: Position3D;
}

// ==========================================================================
// Game Object Types
// ==========================================================================

export interface CircleData {
  id: string;
  colorIndex: number;
  spawnTime: number;
  floatOffset: number;
  floatSpeed: number;
  floatAmplitude: number;
  rotationSpeed: number;
  position: Position3D;
}

export interface NPCData {
  id: string;
  type: string;
  position: Position3D;
  spawnPosition: Position3D;
  targetPosition: Position3D;
  speed: number;
  wanderRadius: number;
  isMoving: boolean;
  moveTimer: number;
  idleTimer: number;
  spawnTime: number;
  rotation: number;
}

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  pitch: number;
  speed: number;
  turnSpeed: number;
}

// ==========================================================================
// Mesh Types (Three.js compatible)
// ==========================================================================

export interface MeshUserData {
  id?: string;
  type?: string;
  [key: string]: unknown;
}

export interface MockMesh {
  id?: string;
  position: Position3D;
  rotation: Rotation3D;
  scale?: Position3D;
  userData: MeshUserData;
  material?: unknown;
  geometry?: unknown;
  castShadow?: boolean;
}

// ==========================================================================
// Scene Types
// ==========================================================================

export interface Scene {
  add(object: unknown): void;
  remove(object: unknown): void;
  children?: unknown[];
}

export interface PhysicsWorld {
  addCircle?(x: number, y: number, z: number, radius: number): void;
  removeCircle?(mesh: unknown): void;
  addNPC?(x: number, y: number, z: number, width: number, height: number, depth: number): void;
  removeNPC?(mesh: unknown): void;
}

export interface SceneManager {
  getSafeSpawnPosition(): Position3D;
}

// ==========================================================================
// Targeting Types
// ==========================================================================

export interface TargetableObject {
  type: string;
  x: number;
  y: number;
  z?: number;
  radius?: number;
}

export interface RaycastHit {
  type: string;
  index: number;
  distance: number;
  object: TargetableObject;
  point?: Position3D;
  group?: string;
  originalIndex?: number;
  angleDiff?: number;
}

export interface RaycastOrigin {
  x: number;
  y: number;
  z?: number;
  angle: number;
  pitch?: number;
}

// ==========================================================================
// Event Types
// ==========================================================================

export type EventCallback = (...args: unknown[]) => void;

export interface EventSubscription {
  event: string;
  callback: EventCallback;
}

// ==========================================================================
// Config Types
// ==========================================================================

export interface GameConfig {
  gameTime: number;
  maxCircles: number;
  maxNPCs: number;
  mapSize: number;
  spawnInterval: number;
  circleLifetime: number;
  circleHitPoints: number;
  npcHitPenalty: number;
  shootRange: number;
  shootConeAngle: number;
}

export interface CircleConfig {
  colors: string[];
  radius: number;
  tubeRadius: number;
  maxCount: number;
  initialSpawnCount: number;
  minHeight: number;
  maxHeight: number;
  floatSpeed: { min: number; max: number };
  floatAmplitude: { min: number; max: number };
  rotationSpeed: { min: number; max: number };
  circleLifetime: number;
}

export interface NPCTypeConfig {
  name: string;
  color: number;
  size: { width: number; height: number; depth: number };
  speed: number;
  wanderRadius: number;
}

// ==========================================================================
// Effect Types
// ==========================================================================

export interface HitMarkerConfig {
  color: string;
  size: number;
  thickness: number;
  duration: number;
  fadeStart: number;
  sound?: string;
}

export interface ShakePreset {
  intensity: number;
  duration: number;
  frequency: number;
  decay: string;
}

export interface ActiveShake {
  elapsed: number;
  duration: number;
  intensity: number;
  frequency: number;
  decay: string;
  offsetX: number;
  offsetY: number;
  angle: number;
  seed: number;
}

// ==========================================================================
// Audio Types
// ==========================================================================

export interface SoundOptions {
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
}

export interface ActiveSound {
  node: AudioBufferSourceNode;
  playing: boolean;
  stop(): void;
}

// ==========================================================================
// Stats Types
// ==========================================================================

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  totalShots: number;
  totalHits: number;
  circleHits: number;
  npcHits: number;
  bestAccuracy: number;
  bestStreak: number;
  totalPlayTime: number;
  firstPlayed: number | null;
  lastPlayed: number | null;
}

export interface SessionStats {
  score: number;
  shots: number;
  hits: number;
  circleHits: number;
  npcHits: number;
  startTime: number;
  endTime: number | null;
  bestStreak: number;
  currentStreak: number;
}

// ==========================================================================
// UI Types
// ==========================================================================

export interface UIElements {
  container?: HTMLElement | null;
  scoreDisplay?: HTMLElement | null;
  timerDisplay?: HTMLElement | null;
  crosshair?: HTMLElement | null;
  menu?: HTMLElement | null;
  gameOver?: HTMLElement | null;
  pauseMenu?: HTMLElement | null;
}

// ==========================================================================
// Utility function for extending Window
// ==========================================================================

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    game?: unknown;
    __pointerLockRequested?: boolean;
  }
}
