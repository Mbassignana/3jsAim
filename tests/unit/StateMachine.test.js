/**
 * Unit tests for StateMachine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  StateMachine,
  GameStates,
  GameActions,
  createGameStateMachine,
} from '@/game/StateMachine.js';

describe('StateMachine', () => {
  let sm;

  beforeEach(() => {
    sm = new StateMachine({
      initialState: 'idle',
      states: {
        idle: {
          onEnter: vi.fn(),
          onExit: vi.fn(),
          transitions: {
            start: { target: 'running' },
          },
        },
        running: {
          onEnter: vi.fn(),
          onExit: vi.fn(),
          onUpdate: vi.fn(),
          transitions: {
            stop: { target: 'idle' },
            pause: { target: 'paused' },
          },
        },
        paused: {
          onEnter: vi.fn(),
          transitions: {
            resume: { target: 'running' },
          },
        },
      },
    });
  });

  describe('constructor', () => {
    it('should throw without initialState', () => {
      expect(() => new StateMachine({ states: { a: {} } })).toThrow('initialState');
    });

    it('should throw without states', () => {
      expect(() => new StateMachine({ initialState: 'a' })).toThrow('at least one state');
    });

    it('should throw if initialState not in states', () => {
      expect(() => new StateMachine({ initialState: 'missing', states: { a: {} } })).toThrow(
        'not found'
      );
    });

    it('should start in initial state', () => {
      expect(sm.currentState).toBe('idle');
    });

    it('should call onEnter for initial state', () => {
      const onEnter = vi.fn();
      new StateMachine({
        initialState: 'a',
        states: { a: { onEnter } },
      });
      expect(onEnter).toHaveBeenCalled();
    });
  });

  describe('currentState', () => {
    it('should return current state name', () => {
      expect(sm.currentState).toBe('idle');
    });
  });

  describe('isInState', () => {
    it('should return true for current state', () => {
      expect(sm.isInState('idle')).toBe(true);
    });

    it('should return false for other states', () => {
      expect(sm.isInState('running')).toBe(false);
    });
  });

  describe('transition', () => {
    it('should transition to target state', () => {
      sm.transition('start');
      expect(sm.currentState).toBe('running');
    });

    it('should call onExit of source state', () => {
      sm.transition('start');
      expect(sm._states.idle.onExit).toHaveBeenCalled();
    });

    it('should call onEnter of target state', () => {
      sm.transition('start');
      expect(sm._states.running.onEnter).toHaveBeenCalled();
    });

    it('should return true on successful transition', () => {
      const result = sm.transition('start');
      expect(result).toBe(true);
    });

    it('should return false for invalid transition', () => {
      const result = sm.transition('invalid');
      expect(result).toBe(false);
    });

    it('should emit transition event', () => {
      const callback = vi.fn();
      sm.on('transition', callback);
      sm.transition('start');
      expect(callback).toHaveBeenCalledWith({
        from: 'idle',
        to: 'running',
        event: 'start',
        payload: {},
      });
    });

    it('should emit enter event', () => {
      const callback = vi.fn();
      sm.on('enter', callback);
      sm.transition('start');
      expect(callback).toHaveBeenCalledWith({
        state: 'running',
        from: 'idle',
        payload: {},
      });
    });

    it('should emit exit event', () => {
      const callback = vi.fn();
      sm.on('exit', callback);
      sm.transition('start');
      expect(callback).toHaveBeenCalledWith({
        state: 'idle',
        to: 'running',
        payload: {},
      });
    });
  });

  describe('transitions with guards', () => {
    it('should block transition when guard returns false', () => {
      const guardedSM = new StateMachine({
        initialState: 'a',
        context: { allowed: false },
        states: {
          a: {
            transitions: {
              go: {
                target: 'b',
                guard: (ctx) => ctx.allowed,
              },
            },
          },
          b: {},
        },
      });

      const result = guardedSM.transition('go');
      expect(result).toBe(false);
      expect(guardedSM.currentState).toBe('a');
    });

    it('should allow transition when guard returns true', () => {
      const guardedSM = new StateMachine({
        initialState: 'a',
        context: { allowed: true },
        states: {
          a: {
            transitions: {
              go: {
                target: 'b',
                guard: (ctx) => ctx.allowed,
              },
            },
          },
          b: {},
        },
      });

      const result = guardedSM.transition('go');
      expect(result).toBe(true);
      expect(guardedSM.currentState).toBe('b');
    });
  });

  describe('transitions with actions', () => {
    it('should execute action during transition', () => {
      const action = vi.fn();
      const actionSM = new StateMachine({
        initialState: 'a',
        states: {
          a: {
            transitions: {
              go: { target: 'b', action },
            },
          },
          b: {},
        },
      });

      actionSM.transition('go');
      expect(action).toHaveBeenCalled();
    });

    it('should pass context and payload to action', () => {
      const action = vi.fn();
      const ctx = { value: 42 };
      const actionSM = new StateMachine({
        initialState: 'a',
        context: ctx,
        states: {
          a: {
            transitions: {
              go: { target: 'b', action },
            },
          },
          b: {},
        },
      });

      actionSM.transition('go', { extra: 'data' });
      expect(action).toHaveBeenCalledWith(ctx, { extra: 'data' });
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(sm.canTransition('start')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(sm.canTransition('stop')).toBe(false);
    });

    it('should check guard when present', () => {
      const guardedSM = new StateMachine({
        initialState: 'a',
        context: { allowed: false },
        states: {
          a: {
            transitions: {
              go: {
                target: 'b',
                guard: (ctx) => ctx.allowed,
              },
            },
          },
          b: {},
        },
      });

      expect(guardedSM.canTransition('go')).toBe(false);
      guardedSM.context.allowed = true;
      expect(guardedSM.canTransition('go')).toBe(true);
    });
  });

  describe('update', () => {
    it('should call onUpdate of current state', () => {
      sm.transition('start');
      sm.update(0.016);
      expect(sm._states.running.onUpdate).toHaveBeenCalledWith(expect.any(Object), 0.016);
    });

    it('should not throw if state has no onUpdate', () => {
      expect(() => sm.update(0.016)).not.toThrow();
    });
  });

  describe('context', () => {
    it('should be accessible', () => {
      const ctx = { value: 123 };
      const ctxSM = new StateMachine({
        initialState: 'a',
        context: ctx,
        states: { a: {} },
      });
      expect(ctxSM.context.value).toBe(123);
    });

    it('should be mutable', () => {
      const ctxSM = new StateMachine({
        initialState: 'a',
        context: { count: 0 },
        states: { a: {} },
      });
      ctxSM.context.count = 10;
      expect(ctxSM.context.count).toBe(10);
    });
  });

  describe('history', () => {
    it('should track state history', () => {
      sm.transition('start');
      sm.transition('pause');
      sm.transition('resume');

      const history = sm.history;
      expect(history).toContain('idle');
      expect(history).toContain('running');
      expect(history).toContain('paused');
    });

    it('should return a copy of history', () => {
      const history1 = sm.history;
      const history2 = sm.history;
      expect(history1).not.toBe(history2);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available event names', () => {
      const transitions = sm.getAvailableTransitions();
      expect(transitions).toEqual(['start']);
    });

    it('should update after transition', () => {
      sm.transition('start');
      const transitions = sm.getAvailableTransitions();
      expect(transitions).toContain('stop');
      expect(transitions).toContain('pause');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      sm.transition('start');
      sm.reset('idle');
      expect(sm.currentState).toBe('idle');
    });

    it('should clear history', () => {
      sm.transition('start');
      sm.transition('stop');
      sm.reset('idle');
      expect(sm.history).toHaveLength(1);
    });
  });
});

describe('createGameStateMachine', () => {
  let gameSM;

  beforeEach(() => {
    gameSM = createGameStateMachine();
  });

  it('should start in menu state', () => {
    expect(gameSM.currentState).toBe(GameStates.MENU);
  });

  it('should transition from menu to playing on start', () => {
    gameSM.transition(GameActions.START);
    expect(gameSM.currentState).toBe(GameStates.PLAYING);
  });

  it('should reset score on start', () => {
    gameSM.context.score = 100;
    gameSM.transition(GameActions.START);
    expect(gameSM.context.score).toBe(0);
  });

  it('should set isRunning to true when playing', () => {
    gameSM.transition(GameActions.START);
    expect(gameSM.context.isRunning).toBe(true);
  });

  it('should pause from playing', () => {
    gameSM.transition(GameActions.START);
    gameSM.transition(GameActions.PAUSE);
    expect(gameSM.currentState).toBe(GameStates.PAUSED);
    expect(gameSM.context.isRunning).toBe(false);
  });

  it('should resume from paused', () => {
    gameSM.transition(GameActions.START);
    gameSM.transition(GameActions.PAUSE);
    gameSM.transition(GameActions.RESUME);
    expect(gameSM.currentState).toBe(GameStates.PLAYING);
    expect(gameSM.context.isRunning).toBe(true);
  });

  it('should end game from playing', () => {
    gameSM.transition(GameActions.START);
    gameSM.transition(GameActions.END);
    expect(gameSM.currentState).toBe(GameStates.ENDED);
  });

  it('should restart from ended to menu', () => {
    gameSM.transition(GameActions.START);
    gameSM.transition(GameActions.END);
    gameSM.transition(GameActions.RESTART);
    expect(gameSM.currentState).toBe(GameStates.MENU);
  });

  it('should timeout when time runs out', () => {
    gameSM.transition(GameActions.START);
    gameSM.context.timeRemaining = 0;
    const result = gameSM.transition(GameActions.TIMEOUT);
    expect(result).toBe(true);
    expect(gameSM.currentState).toBe(GameStates.ENDED);
  });

  it('should not timeout when time remains', () => {
    gameSM.transition(GameActions.START);
    gameSM.context.timeRemaining = 60;
    const result = gameSM.transition(GameActions.TIMEOUT);
    expect(result).toBe(false);
    expect(gameSM.currentState).toBe(GameStates.PLAYING);
  });

  it('should update time while playing', () => {
    gameSM.transition(GameActions.START);
    const initialTime = gameSM.context.timeRemaining;
    gameSM.update(1);
    expect(gameSM.context.timeRemaining).toBe(initialTime - 1);
  });

  it('should accept custom initial context', () => {
    const customSM = createGameStateMachine({ score: 500 });
    expect(customSM.context.score).toBe(500);
  });
});
