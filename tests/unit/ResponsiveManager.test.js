/**
 * Unit tests for ResponsiveManager
 * Tests responsive design handling for different screen sizes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  ResponsiveManager,
  Breakpoints,
  DeviceTypes,
  Orientations,
  ScalingPresets,
  getResponsiveManager,
  resetResponsiveManager,
} from '../../src/ui/ResponsiveManager.js';
import { resetSettingsManager } from '../../src/ui/SettingsManager.js';

describe('ResponsiveManager', () => {
  let responsive;

  beforeEach(() => {
    resetResponsiveManager();
    resetSettingsManager();
    responsive = new ResponsiveManager();
  });

  afterEach(() => {
    resetResponsiveManager();
    resetSettingsManager();
  });

  // ==========================================================================
  // Breakpoints
  // ==========================================================================
  describe('Breakpoints', () => {
    it('should define all breakpoints', () => {
      expect(Breakpoints.MOBILE).toBe(480);
      expect(Breakpoints.TABLET).toBe(768);
      expect(Breakpoints.DESKTOP).toBe(1024);
      expect(Breakpoints.LARGE_DESKTOP).toBe(1440);
      expect(Breakpoints.ULTRA_WIDE).toBe(2560);
    });
  });

  // ==========================================================================
  // DeviceTypes
  // ==========================================================================
  describe('DeviceTypes', () => {
    it('should define all device types', () => {
      expect(DeviceTypes.MOBILE).toBe('mobile');
      expect(DeviceTypes.TABLET).toBe('tablet');
      expect(DeviceTypes.DESKTOP).toBe('desktop');
      expect(DeviceTypes.LARGE_DESKTOP).toBe('large_desktop');
      expect(DeviceTypes.ULTRA_WIDE).toBe('ultra_wide');
    });
  });

  // ==========================================================================
  // Orientations
  // ==========================================================================
  describe('Orientations', () => {
    it('should define all orientations', () => {
      expect(Orientations.PORTRAIT).toBe('portrait');
      expect(Orientations.LANDSCAPE).toBe('landscape');
    });
  });

  // ==========================================================================
  // ScalingPresets
  // ==========================================================================
  describe('ScalingPresets', () => {
    it('should have presets for all device types', () => {
      expect(ScalingPresets.mobile).toBeDefined();
      expect(ScalingPresets.tablet).toBeDefined();
      expect(ScalingPresets.desktop).toBeDefined();
      expect(ScalingPresets.large_desktop).toBeDefined();
      expect(ScalingPresets.ultra_wide).toBeDefined();
    });

    it('should have scaling properties in each preset', () => {
      for (const preset of Object.values(ScalingPresets)) {
        expect(preset.uiScale).toBeDefined();
        expect(preset.crosshairSize).toBeDefined();
        expect(preset.fontSize).toBeDefined();
        expect(preset.menuPadding).toBeDefined();
        expect(preset.buttonSize).toBeDefined();
        expect(preset.minimapSize).toBeDefined();
        expect(preset.hudMargin).toBeDefined();
      }
    });

    it('should have progressively larger scales', () => {
      expect(ScalingPresets.mobile.uiScale).toBeLessThan(ScalingPresets.tablet.uiScale);
      expect(ScalingPresets.tablet.uiScale).toBeLessThan(ScalingPresets.desktop.uiScale);
      expect(ScalingPresets.desktop.uiScale).toBeLessThan(ScalingPresets.large_desktop.uiScale);
    });
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(responsive.isInitialized()).toBe(false);
      expect(responsive.width).toBe(1024);
      expect(responsive.height).toBe(768);
    });
  });

  // ==========================================================================
  // init()
  // ==========================================================================
  describe('init()', () => {
    it('should initialize with default dimensions', () => {
      responsive.init({ width: 1920, height: 1080 });

      expect(responsive.isInitialized()).toBe(true);
      expect(responsive.width).toBe(1920);
      expect(responsive.height).toBe(1080);
    });

    it('should emit responsive:init event', () => {
      const callback = vi.fn();
      responsive.on('responsive:init', callback);

      responsive.init({ width: 1024, height: 768 });

      expect(callback).toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', () => {
      const callback = vi.fn();
      responsive.on('responsive:init', callback);

      responsive.init({ width: 1024, height: 768 });
      responsive.init({ width: 1920, height: 1080 });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Getters
  // ==========================================================================
  describe('getters', () => {
    it('should return width', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.width).toBe(1920);
    });

    it('should return height', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.height).toBe(1080);
    });

    it('should return device type', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.deviceType).toBe(DeviceTypes.LARGE_DESKTOP);
    });

    it('should return orientation', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.orientation).toBe(Orientations.LANDSCAPE);
    });

    it('should return aspect ratio', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.aspectRatio).toBeCloseTo(1920 / 1080);
    });

    it('should return scaling preset', () => {
      responsive.init({ width: 1024, height: 768 });
      const preset = responsive.scalingPreset;
      expect(preset.uiScale).toBe(ScalingPresets.desktop.uiScale);
    });
  });

  // ==========================================================================
  // setDimensions()
  // ==========================================================================
  describe('setDimensions()', () => {
    it('should update dimensions', () => {
      responsive.init({ width: 1024, height: 768 });
      responsive.setDimensions(1920, 1080);

      expect(responsive.width).toBe(1920);
      expect(responsive.height).toBe(1080);
    });

    it('should emit viewport:resize event', () => {
      const callback = vi.fn();
      responsive.on('viewport:resize', callback);

      responsive.init({ width: 1024, height: 768 });
      responsive.setDimensions(1920, 1080);

      expect(callback).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });

    it('should emit responsive:change when device type changes', () => {
      const callback = vi.fn();
      responsive.on('responsive:change', callback);

      responsive.init({ width: 1024, height: 768 });
      responsive.setDimensions(400, 600);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceChanged: true,
          deviceType: DeviceTypes.MOBILE,
        })
      );
    });
  });

  // ==========================================================================
  // getDimensions()
  // ==========================================================================
  describe('getDimensions()', () => {
    it('should return current dimensions', () => {
      responsive.init({ width: 1920, height: 1080 });
      const dims = responsive.getDimensions();

      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);
    });
  });

  // ==========================================================================
  // isBreakpoint()
  // ==========================================================================
  describe('isBreakpoint()', () => {
    it('should return true for current breakpoint', () => {
      responsive.init({ width: 1024, height: 768 });
      expect(responsive.isBreakpoint(DeviceTypes.DESKTOP)).toBe(true);
    });

    it('should return false for other breakpoints', () => {
      responsive.init({ width: 1024, height: 768 });
      expect(responsive.isBreakpoint(DeviceTypes.MOBILE)).toBe(false);
    });
  });

  // ==========================================================================
  // isAtLeast() / isAtMost()
  // ==========================================================================
  describe('isAtLeast()', () => {
    it('should return true if at or above breakpoint', () => {
      responsive.init({ width: 1024, height: 768 });

      expect(responsive.isAtLeast(DeviceTypes.MOBILE)).toBe(true);
      expect(responsive.isAtLeast(DeviceTypes.TABLET)).toBe(true);
      expect(responsive.isAtLeast(DeviceTypes.DESKTOP)).toBe(true);
      expect(responsive.isAtLeast(DeviceTypes.LARGE_DESKTOP)).toBe(false);
    });
  });

  describe('isAtMost()', () => {
    it('should return true if at or below breakpoint', () => {
      responsive.init({ width: 1024, height: 768 });

      expect(responsive.isAtMost(DeviceTypes.MOBILE)).toBe(false);
      expect(responsive.isAtMost(DeviceTypes.TABLET)).toBe(false);
      expect(responsive.isAtMost(DeviceTypes.DESKTOP)).toBe(true);
      expect(responsive.isAtMost(DeviceTypes.LARGE_DESKTOP)).toBe(true);
    });
  });

  // ==========================================================================
  // Device Detection
  // ==========================================================================
  describe('device detection', () => {
    describe('isMobile()', () => {
      it('should return true for mobile width', () => {
        responsive.init({ width: 400, height: 600 });
        expect(responsive.isMobile()).toBe(true);
      });

      it('should return false for desktop width', () => {
        responsive.init({ width: 1920, height: 1080 });
        expect(responsive.isMobile()).toBe(false);
      });
    });

    describe('isTablet()', () => {
      it('should return true for tablet width', () => {
        responsive.init({ width: 800, height: 600 });
        expect(responsive.isTablet()).toBe(true);
      });

      it('should return false for mobile width', () => {
        responsive.init({ width: 400, height: 600 });
        expect(responsive.isTablet()).toBe(false);
      });
    });

    describe('isDesktop()', () => {
      it('should return true for desktop width', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.isDesktop()).toBe(true);
      });

      it('should return true for larger widths', () => {
        responsive.init({ width: 2560, height: 1440 });
        expect(responsive.isDesktop()).toBe(true);
      });

      it('should return false for tablet width', () => {
        responsive.init({ width: 800, height: 600 });
        expect(responsive.isDesktop()).toBe(false);
      });
    });

    describe('isPortrait()', () => {
      it('should return true for portrait dimensions', () => {
        responsive.init({ width: 600, height: 1024 });
        expect(responsive.isPortrait()).toBe(true);
      });

      it('should return false for landscape dimensions', () => {
        responsive.init({ width: 1024, height: 600 });
        expect(responsive.isPortrait()).toBe(false);
      });
    });

    describe('isLandscape()', () => {
      it('should return true for landscape dimensions', () => {
        responsive.init({ width: 1024, height: 600 });
        expect(responsive.isLandscape()).toBe(true);
      });

      it('should return true for square dimensions', () => {
        responsive.init({ width: 1000, height: 1000 });
        expect(responsive.isLandscape()).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Scaling Methods
  // ==========================================================================
  describe('scaling methods', () => {
    describe('getUIScale()', () => {
      it('should return UI scale factor', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getUIScale()).toBe(1.0);
      });

      it('should return smaller scale for mobile', () => {
        responsive.init({ width: 400, height: 600 });
        expect(responsive.getUIScale()).toBeLessThan(1.0);
      });
    });

    describe('scale()', () => {
      it('should scale a value by UI scale factor', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.scale(100)).toBe(100);

        responsive.setDimensions(400, 600);
        expect(responsive.scale(100)).toBe(100 * ScalingPresets.mobile.uiScale);
      });
    });

    describe('getFontSize()', () => {
      it('should return font size for tier', () => {
        responsive.init({ width: 1024, height: 768 });

        expect(responsive.getFontSize('small')).toBe(ScalingPresets.desktop.fontSize.small);
        expect(responsive.getFontSize('medium')).toBe(ScalingPresets.desktop.fontSize.medium);
        expect(responsive.getFontSize('large')).toBe(ScalingPresets.desktop.fontSize.large);
      });

      it('should default to medium for unknown tier', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getFontSize('unknown')).toBe(ScalingPresets.desktop.fontSize.medium);
      });
    });

    describe('getCrosshairSize()', () => {
      it('should return crosshair size', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getCrosshairSize()).toBe(ScalingPresets.desktop.crosshairSize);
      });
    });

    describe('getMenuPadding()', () => {
      it('should return menu padding', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getMenuPadding()).toBe(ScalingPresets.desktop.menuPadding);
      });
    });

    describe('getButtonSize()', () => {
      it('should return button size', () => {
        responsive.init({ width: 1024, height: 768 });
        const size = responsive.getButtonSize();

        expect(size.width).toBe(ScalingPresets.desktop.buttonSize.width);
        expect(size.height).toBe(ScalingPresets.desktop.buttonSize.height);
      });
    });

    describe('getMinimapSize()', () => {
      it('should return minimap size', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getMinimapSize()).toBe(ScalingPresets.desktop.minimapSize);
      });
    });

    describe('getHUDMargin()', () => {
      it('should return HUD margin', () => {
        responsive.init({ width: 1024, height: 768 });
        expect(responsive.getHUDMargin()).toBe(ScalingPresets.desktop.hudMargin);
      });
    });
  });

  // ==========================================================================
  // Custom Breakpoints
  // ==========================================================================
  describe('custom breakpoints', () => {
    describe('addCustomBreakpoint()', () => {
      it('should add a custom breakpoint', () => {
        responsive.init({ width: 1024, height: 768 });
        responsive.addCustomBreakpoint('custom', 1800, { uiScale: 1.5 });

        expect(responsive._customBreakpoints.has('custom')).toBe(true);
      });

      it('should emit breakpoint:added event', () => {
        const callback = vi.fn();
        responsive.on('breakpoint:added', callback);

        responsive.init({ width: 1024, height: 768 });
        responsive.addCustomBreakpoint('custom', 1800, { uiScale: 1.5 });

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'custom',
            minWidth: 1800,
          })
        );
      });
    });

    describe('removeCustomBreakpoint()', () => {
      it('should remove a custom breakpoint', () => {
        responsive.init({ width: 1024, height: 768 });
        responsive.addCustomBreakpoint('custom', 1800, { uiScale: 1.5 });
        responsive.removeCustomBreakpoint('custom');

        expect(responsive._customBreakpoints.has('custom')).toBe(false);
      });

      it('should emit breakpoint:removed event', () => {
        const callback = vi.fn();
        responsive.on('breakpoint:removed', callback);

        responsive.init({ width: 1024, height: 768 });
        responsive.addCustomBreakpoint('custom', 1800, { uiScale: 1.5 });
        responsive.removeCustomBreakpoint('custom');

        expect(callback).toHaveBeenCalledWith({ name: 'custom' });
      });
    });
  });

  // ==========================================================================
  // State
  // ==========================================================================
  describe('getState()', () => {
    it('should return complete responsive state', () => {
      responsive.init({ width: 1024, height: 768 });
      const state = responsive.getState();

      expect(state.width).toBe(1024);
      expect(state.height).toBe(768);
      expect(state.deviceType).toBe(DeviceTypes.DESKTOP);
      expect(state.orientation).toBe(Orientations.LANDSCAPE);
      expect(state.aspectRatio).toBeCloseTo(1024 / 768);
      expect(state.scalingPreset).toBeDefined();
      expect(state.isMobile).toBe(false);
      expect(state.isTablet).toBe(false);
      expect(state.isDesktop).toBe(true);
      expect(state.isPortrait).toBe(false);
      expect(state.isLandscape).toBe(true);
    });
  });

  // ==========================================================================
  // CSS Properties
  // ==========================================================================
  describe('CSS properties', () => {
    describe('getCSSProperties()', () => {
      it('should return CSS custom properties', () => {
        responsive.init({ width: 1024, height: 768 });
        const props = responsive.getCSSProperties();

        expect(props['--ui-scale']).toBe(1.0);
        expect(props['--crosshair-size']).toBe('20px');
        expect(props['--font-size-small']).toBe('14px');
        expect(props['--font-size-medium']).toBe('18px');
        expect(props['--font-size-large']).toBe('24px');
        expect(props['--menu-padding']).toBe('40px');
        expect(props['--minimap-size']).toBe('200px');
        expect(props['--hud-margin']).toBe('20px');
      });
    });

    describe('applyCSSProperties()', () => {
      it('should apply CSS properties to element', () => {
        const mockElement = {
          style: {
            setProperty: vi.fn(),
          },
        };

        responsive.init({ width: 1024, height: 768 });
        responsive.applyCSSProperties(mockElement);

        expect(mockElement.style.setProperty).toHaveBeenCalledWith('--ui-scale', '1');
        expect(mockElement.style.setProperty).toHaveBeenCalledWith('--crosshair-size', '20px');
      });

      it('should emit css:applied event', () => {
        const callback = vi.fn();
        responsive.on('css:applied', callback);

        const mockElement = {
          style: {
            setProperty: vi.fn(),
          },
        };

        responsive.init({ width: 1024, height: 768 });
        responsive.applyCSSProperties(mockElement);

        expect(callback).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================
  describe('static methods', () => {
    describe('getBreakpoints()', () => {
      it('should return all breakpoints', () => {
        const breakpoints = ResponsiveManager.getBreakpoints();

        expect(breakpoints.MOBILE).toBe(480);
        expect(breakpoints.DESKTOP).toBe(1024);
      });
    });

    describe('getDeviceTypes()', () => {
      it('should return all device types', () => {
        const types = ResponsiveManager.getDeviceTypes();

        expect(types.MOBILE).toBe('mobile');
        expect(types.DESKTOP).toBe('desktop');
      });
    });

    describe('getOrientations()', () => {
      it('should return all orientations', () => {
        const orientations = ResponsiveManager.getOrientations();

        expect(orientations.PORTRAIT).toBe('portrait');
        expect(orientations.LANDSCAPE).toBe('landscape');
      });
    });

    describe('getScalingPresets()', () => {
      it('should return all scaling presets', () => {
        const presets = ResponsiveManager.getScalingPresets();

        expect(presets.mobile).toBeDefined();
        expect(presets.desktop).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetResponsiveManager();
    });

    it('should return same instance', () => {
      const instance1 = getResponsiveManager();
      const instance2 = getResponsiveManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getResponsiveManager();
      instance1.init({ width: 1920, height: 1080 });

      resetResponsiveManager();

      const instance2 = getResponsiveManager();
      expect(instance2).not.toBe(instance1);
      expect(instance2.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // destroy()
  // ==========================================================================
  describe('destroy()', () => {
    it('should clean up resources', () => {
      responsive.init({ width: 1024, height: 768 });
      responsive.destroy();

      expect(responsive.isInitialized()).toBe(false);
    });

    it('should emit responsive:destroyed event', () => {
      const callback = vi.fn();
      responsive.on('responsive:destroyed', callback);

      responsive.init({ width: 1024, height: 768 });
      responsive.destroy();

      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Device Type Calculation
  // ==========================================================================
  describe('device type calculation', () => {
    it('should detect mobile for small widths', () => {
      responsive.init({ width: 320, height: 568 });
      expect(responsive.deviceType).toBe(DeviceTypes.MOBILE);
    });

    it('should detect tablet for medium widths', () => {
      responsive.init({ width: 800, height: 600 });
      expect(responsive.deviceType).toBe(DeviceTypes.TABLET);
    });

    it('should detect desktop for standard widths', () => {
      responsive.init({ width: 1280, height: 720 });
      expect(responsive.deviceType).toBe(DeviceTypes.DESKTOP);
    });

    it('should detect large desktop for high resolution', () => {
      responsive.init({ width: 1920, height: 1080 });
      expect(responsive.deviceType).toBe(DeviceTypes.LARGE_DESKTOP);
    });

    it('should detect ultra wide for very large widths', () => {
      responsive.init({ width: 3440, height: 1440 });
      expect(responsive.deviceType).toBe(DeviceTypes.ULTRA_WIDE);
    });
  });

  // ==========================================================================
  // Orientation Changes
  // ==========================================================================
  describe('orientation changes', () => {
    it('should emit responsive:change when orientation changes', () => {
      const callback = vi.fn();
      responsive.on('responsive:change', callback);

      responsive.init({ width: 1024, height: 768 });
      responsive.setDimensions(768, 1024);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          orientationChanged: true,
          orientation: Orientations.PORTRAIT,
        })
      );
    });
  });
});
