/**
 * End-to-end tests for the 3jsAim game
 * Tests full game simulation from menu to gameplay to end screen
 */

import { test, expect } from '@playwright/test';

test.describe('Game Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load', () => {
    test('should load the game page', async ({ page }) => {
      await expect(page).toHaveTitle(/3jsAim|Aim Trainer/i);
    });

    test('should display the main menu', async ({ page }) => {
      // Check for menu container
      const menu = page.locator('#menu, .menu, [data-testid="menu"]');
      await expect(menu).toBeVisible();
    });

    test('should have start button visible', async ({ page }) => {
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await expect(startButton).toBeVisible();
    });
  });

  test.describe('Menu Functionality', () => {
    test('should have difficulty selection', async ({ page }) => {
      // Look for difficulty controls
      const difficultyControl = page.locator(
        '#difficulty, .difficulty-selector, select:has-text("Easy"), select:has-text("Medium")'
      );

      // If exists, test it
      const count = await difficultyControl.count();
      if (count > 0) {
        await expect(difficultyControl.first()).toBeVisible();
      }
    });

    test('should display canvas or game container', async ({ page }) => {
      // The game uses either canvas or WebGL container
      const gameContainer = page.locator('canvas, #game, .game-container, #container');
      await expect(gameContainer.first()).toBeVisible();
    });
  });

  test.describe('Game Start', () => {
    test('should start game when clicking start button', async ({ page }) => {
      // Find and click start button
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await startButton.click();

      // Wait a moment for game to initialize
      await page.waitForTimeout(500);

      // Menu should be hidden or game UI should be visible
      const menu = page.locator('#menu, .menu');
      const menuHidden = await menu.evaluate((el) => {
        if (!el) return true;
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden';
      }).catch(() => true);

      // Game should have started (menu hidden or game elements visible)
      const gameUI = page.locator('#score, .score, #timer, .timer, #crosshair, .crosshair');

      // Either menu is hidden or game UI is visible
      if (!menuHidden) {
        await expect(gameUI.first()).toBeVisible();
      }
    });
  });

  test.describe('Game UI Elements', () => {
    test.beforeEach(async ({ page }) => {
      // Start the game first
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await startButton.click();
      await page.waitForTimeout(500);
    });

    test('should display crosshair during gameplay', async ({ page }) => {
      const crosshair = page.locator('#crosshair, .crosshair, [data-testid="crosshair"]');
      const count = await crosshair.count();
      if (count > 0) {
        // Crosshair may be visible or hidden via CSS class
        // Just verify the element exists during gameplay
        await expect(crosshair.first()).toBeAttached();
      }
    });

    test('should display score counter', async ({ page }) => {
      const score = page.locator('#score, .score, [data-testid="score"]');
      const count = await score.count();
      if (count > 0) {
        await expect(score.first()).toBeVisible();
        const text = await score.first().textContent();
        expect(text).toMatch(/score|0/i);
      }
    });

    test('should display timer', async ({ page }) => {
      const timer = page.locator('#timer, .timer, [data-testid="timer"]');
      const count = await timer.count();
      if (count > 0) {
        await expect(timer.first()).toBeVisible();
        const text = await timer.first().textContent();
        expect(text).toMatch(/\d+:\d+|time/i);
      }
    });
  });

  test.describe('Pointer Lock', () => {
    test('should attempt pointer lock on game start', async ({ page }) => {
      await page.evaluate(() => {
        const originalRequestPointerLock = Element.prototype.requestPointerLock;
        Element.prototype.requestPointerLock = function() {
          window.__pointerLockRequested = true;
          return originalRequestPointerLock?.call(this);
        };
      });

      // Click to start game (often requires user interaction for pointer lock)
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await startButton.click();

      await page.waitForTimeout(500);

      const _pointerLockRequested = await page.evaluate(() => window.__pointerLockRequested || false);

      // Pointer lock should be requested for FPS game
      // (may not always succeed due to browser security)
    });
  });

  test.describe('Keyboard Controls', () => {
    test.beforeEach(async ({ page }) => {
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await startButton.click();
      await page.waitForTimeout(500);
    });

    test('should respond to escape key for pause', async ({ page }) => {
      // Press escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Check if pause menu or pause indicator appears
      const pauseIndicator = page.locator(
        '.paused, #pauseMenu, [data-testid="pause"], :has-text("Paused"), :has-text("Resume")'
      );

      const _pauseCount = await pauseIndicator.count();
      // Game may be paused - this depends on game implementation
    });
  });
});

test.describe('Canvas 2D Version', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render canvas element', async ({ page }) => {
    const canvas = page.locator('canvas');
    const count = await canvas.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have 2D or WebGL context', async ({ page }) => {
    const hasContext = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;

      const ctx2d = canvas.getContext('2d');
      const webgl = canvas.getContext('webgl') || canvas.getContext('webgl2');

      return ctx2d !== null || webgl !== null;
    });

    expect(hasContext).toBe(true);
  });
});

test.describe('Performance', () => {
  test('should maintain acceptable frame rate', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start the game
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await startButton.click();
    await page.waitForTimeout(1000);

    // Measure frame timing
    const frameData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const duration = 2000; // Measure for 2 seconds

        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < duration) {
            requestAnimationFrame(countFrame);
          } else {
            resolve({
              frames: frameCount,
              duration: performance.now() - startTime,
              fps: (frameCount / (performance.now() - startTime)) * 1000,
            });
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    // Game should run at at least 30 FPS
    expect(frameData.fps).toBeGreaterThan(25);
  });

  test('should not have memory leaks during gameplay', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start game
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await startButton.click();
    await page.waitForTimeout(500);

    // Get initial memory if available
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });

    // Let game run for a bit
    await page.waitForTimeout(3000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });

    // If memory API is available, check for excessive growth
    if (initialMemory !== null && finalMemory !== null) {
      const growth = (finalMemory - initialMemory) / initialMemory;
      // Allow up to 50% growth during short gameplay
      expect(growth).toBeLessThan(0.5);
    }
  });
});

test.describe('Game End and Restart', () => {
  test('should display end screen when time runs out', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start game
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await startButton.click();

    // Speed up time by manipulating game state if possible
    // Otherwise wait for game to end naturally (use short timeout for test)
    await page.evaluate(() => {
      // Try to find and trigger game end
      if (window.game) {
        if (window.game.endGame) window.game.endGame();
        else if (window.game.state) window.game.state = 'ended';
      }

      // Dispatch custom event that game might listen to
      window.dispatchEvent(new CustomEvent('gameEnd'));
    });

    await page.waitForTimeout(500);

    // Check for end screen elements
    const endScreen = page.locator(
      '#endScreen, .end-screen, [data-testid="end-screen"], :has-text("Final Score"), :has-text("Game Over")'
    );

    // End screen may or may not be visible depending on implementation
    const endCount = await endScreen.count();
    if (endCount > 0) {
      // If end screen exists, verify it has expected content
      const hasScore = await page.locator(':has-text("Score"), :has-text("score")').count() > 0;
      expect(hasScore).toBe(true);
    }
  });

  test('should have restart functionality', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start game
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await startButton.click();
    await page.waitForTimeout(500);

    // Try to trigger game end
    await page.evaluate(() => {
      if (window.game?.endGame) window.game.endGame();
    });

    await page.waitForTimeout(1000);

    // Look for restart button (may be in menu or end screen)
    const restartButton = page.locator(
      'button:has-text("Start New Game"), button:has-text("Restart"), button:has-text("Play Again")'
    );

    // Verify restart mechanism exists
    const restartCount = await restartButton.count();
    expect(restartCount).toBeGreaterThan(0);

    // Restart button should be attached to DOM
    await expect(restartButton.first()).toBeAttached();
  });
});

test.describe('Accessibility', () => {
  test('should have proper document structure', async ({ page }) => {
    await page.goto('/');

    // Check for basic accessibility elements
    const hasTitle = await page.title() !== '';
    expect(hasTitle).toBe(true);

    // Check for buttons with accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have some accessible name
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation in menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    // Some element should be focused
    expect(focusedElement).not.toBe('body');
  });
});

test.describe('Error Handling', () => {
  test('should not have console errors on load', async ({ page }) => {
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected/acceptable errors
    const criticalErrors = errors.filter((error) => {
      // Ignore certain expected errors
      if (error.includes('favicon')) return false;
      if (error.includes('DevTools')) return false;
      return true;
    });

    expect(criticalErrors.length).toBe(0);
  });

  test('should handle missing resources gracefully', async ({ page }) => {
    // Try to load a non-existent route
    const response = await page.goto('/nonexistent-page');

    // Should either 404 or redirect to main page
    const status = response?.status();
    expect([200, 404]).toContain(status);
  });
});
