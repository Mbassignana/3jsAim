// LevelManager - Enhanced gameplay loop with waves, challenges, and progression
class LevelManager {
    constructor(game) {
        this.game = game;

        // Game mode configuration
        this.gameModes = {
            CLASSIC: 'classic',           // Time-based, hit as many targets as possible
            FLICK_SHOT: 'flickShot',      // Targets appear briefly, require quick flicks
            TRACKING: 'tracking',          // Targets move smoothly, require tracking
            REACTION: 'reaction',          // Targets appear suddenly, test reaction time
            PRECISION: 'precision',        // Small targets, accuracy focused
            ELIMINATION: 'elimination',    // Clear waves of targets
            SURVIVAL: 'survival'           // Endless with increasing difficulty
        };

        // Current state
        this.currentMode = this.gameModes.CLASSIC;
        this.currentWave = 1;
        this.maxWaves = 5;
        this.isWarmingUp = false;
        this.warmupTimeRemaining = 0;
        this.waveTimeRemaining = 0;
        this.roundStats = this.createEmptyStats();

        // Difficulty scaling
        this.difficultyMultiplier = 1.0;
        this.baseTargetSpeed = 1.0;
        this.baseSpawnInterval = 3.0;
        this.baseTargetLifetime = 8.0;

        // Scoring
        this.streakCount = 0;
        this.maxStreak = 0;
        this.scoreMultiplier = 1.0;
        this.lastHitTime = 0;
        this.streakTimeout = 2000; // 2 seconds to maintain streak

        // Target patterns
        this.targetPatterns = this.initTargetPatterns();

        // Wave configurations by mode
        this.waveConfigs = this.initWaveConfigs();
    }

    createEmptyStats() {
        return {
            shotsHired: 0,
            shotsMissed: 0,
            targetsHit: 0,
            targetsMissed: 0,
            accuracy: 0,
            averageReactionTime: 0,
            reactionTimes: [],
            score: 0,
            maxStreak: 0,
            waveNumber: 1,
            timeElapsed: 0
        };
    }

    initTargetPatterns() {
        return {
            // Static targets in fixed positions
            STATIC: {
                name: 'Static',
                movement: 'none',
                speedMultiplier: 0,
                description: 'Stationary targets'
            },
            // Targets float gently up and down
            FLOATING: {
                name: 'Floating',
                movement: 'float',
                speedMultiplier: 1.0,
                description: 'Gently bobbing targets'
            },
            // Targets move in a line
            STRAFING: {
                name: 'Strafing',
                movement: 'strafe',
                speedMultiplier: 1.5,
                description: 'Side-to-side movement'
            },
            // Targets appear and disappear
            POPUP: {
                name: 'Pop-up',
                movement: 'popup',
                speedMultiplier: 0,
                lifetime: 2.0,
                description: 'Brief appearance'
            },
            // Targets move erratically
            ERRATIC: {
                name: 'Erratic',
                movement: 'erratic',
                speedMultiplier: 2.0,
                description: 'Unpredictable movement'
            },
            // Targets orbit a point
            ORBITAL: {
                name: 'Orbital',
                movement: 'orbit',
                speedMultiplier: 1.2,
                description: 'Circular movement'
            }
        };
    }

    initWaveConfigs() {
        return {
            [this.gameModes.CLASSIC]: [
                { wave: 1, targets: 8, pattern: 'FLOATING', time: 30, spawnInterval: 4 },
                { wave: 2, targets: 10, pattern: 'FLOATING', time: 30, spawnInterval: 3.5 },
                { wave: 3, targets: 12, pattern: 'STRAFING', time: 30, spawnInterval: 3 },
                { wave: 4, targets: 14, pattern: 'STRAFING', time: 30, spawnInterval: 2.5 },
                { wave: 5, targets: 16, pattern: 'ERRATIC', time: 30, spawnInterval: 2 }
            ],
            [this.gameModes.FLICK_SHOT]: [
                { wave: 1, targets: 10, pattern: 'POPUP', time: 30, targetLifetime: 1.5 },
                { wave: 2, targets: 12, pattern: 'POPUP', time: 30, targetLifetime: 1.2 },
                { wave: 3, targets: 15, pattern: 'POPUP', time: 30, targetLifetime: 1.0 },
                { wave: 4, targets: 18, pattern: 'POPUP', time: 30, targetLifetime: 0.8 },
                { wave: 5, targets: 20, pattern: 'POPUP', time: 30, targetLifetime: 0.6 }
            ],
            [this.gameModes.TRACKING]: [
                { wave: 1, targets: 5, pattern: 'STRAFING', time: 30, speedMultiplier: 0.8 },
                { wave: 2, targets: 6, pattern: 'STRAFING', time: 30, speedMultiplier: 1.0 },
                { wave: 3, targets: 7, pattern: 'ORBITAL', time: 30, speedMultiplier: 1.2 },
                { wave: 4, targets: 8, pattern: 'ORBITAL', time: 30, speedMultiplier: 1.4 },
                { wave: 5, targets: 10, pattern: 'ERRATIC', time: 30, speedMultiplier: 1.6 }
            ],
            [this.gameModes.REACTION]: [
                { wave: 1, targets: 15, pattern: 'POPUP', time: 30, targetLifetime: 2.0 },
                { wave: 2, targets: 20, pattern: 'POPUP', time: 30, targetLifetime: 1.5 },
                { wave: 3, targets: 25, pattern: 'POPUP', time: 30, targetLifetime: 1.2 },
                { wave: 4, targets: 30, pattern: 'POPUP', time: 30, targetLifetime: 1.0 },
                { wave: 5, targets: 35, pattern: 'POPUP', time: 30, targetLifetime: 0.8 }
            ],
            [this.gameModes.PRECISION]: [
                { wave: 1, targets: 10, pattern: 'STATIC', time: 30, targetSize: 0.5 },
                { wave: 2, targets: 12, pattern: 'STATIC', time: 30, targetSize: 0.4 },
                { wave: 3, targets: 14, pattern: 'FLOATING', time: 30, targetSize: 0.35 },
                { wave: 4, targets: 16, pattern: 'FLOATING', time: 30, targetSize: 0.3 },
                { wave: 5, targets: 18, pattern: 'STRAFING', time: 30, targetSize: 0.25 }
            ],
            [this.gameModes.ELIMINATION]: [
                { wave: 1, targets: 10, pattern: 'FLOATING', timeLimit: null },
                { wave: 2, targets: 15, pattern: 'STRAFING', timeLimit: null },
                { wave: 3, targets: 20, pattern: 'STRAFING', timeLimit: null },
                { wave: 4, targets: 25, pattern: 'ERRATIC', timeLimit: null },
                { wave: 5, targets: 30, pattern: 'ERRATIC', timeLimit: null }
            ],
            [this.gameModes.SURVIVAL]: [
                { wave: 1, targets: 5, pattern: 'FLOATING', endless: true, spawnRate: 3 },
                { wave: 2, targets: 6, pattern: 'STRAFING', endless: true, spawnRate: 2.5 },
                { wave: 3, targets: 7, pattern: 'STRAFING', endless: true, spawnRate: 2 },
                { wave: 4, targets: 8, pattern: 'ERRATIC', endless: true, spawnRate: 1.5 },
                { wave: 5, targets: 10, pattern: 'ERRATIC', endless: true, spawnRate: 1 }
            ]
        };
    }

    // Set the game mode
    setGameMode(mode) {
        if (this.gameModes[mode] || Object.values(this.gameModes).includes(mode)) {
            this.currentMode = typeof mode === 'string' && this.gameModes[mode] ? this.gameModes[mode] : mode;
            this.currentWave = 1;
            this.resetStats();
            console.log(`Game mode set to: ${this.currentMode}`);
            return true;
        }
        console.warn(`Unknown game mode: ${mode}`);
        return false;
    }

    // Get current wave configuration
    getCurrentWaveConfig() {
        const modeConfigs = this.waveConfigs[this.currentMode];
        if (!modeConfigs) {
            return this.getDefaultWaveConfig();
        }

        const waveIndex = Math.min(this.currentWave - 1, modeConfigs.length - 1);
        return modeConfigs[waveIndex];
    }

    getDefaultWaveConfig() {
        return {
            wave: this.currentWave,
            targets: 8 + (this.currentWave * 2),
            pattern: 'FLOATING',
            time: 30,
            spawnInterval: Math.max(1.5, 4 - (this.currentWave * 0.5))
        };
    }

    // Start a new wave
    startWave() {
        const config = this.getCurrentWaveConfig();

        console.log(`Starting Wave ${this.currentWave}: ${JSON.stringify(config)}`);

        // Apply wave configuration
        this.waveTimeRemaining = config.time || 30;
        this.difficultyMultiplier = 1 + (this.currentWave - 1) * 0.15;

        // Clear existing targets
        if (this.game.circleManager) {
            this.game.circleManager.reset();
        }

        // Spawn initial targets based on pattern
        this.spawnWaveTargets(config);

        // Notify UI
        if (this.game.ui) {
            this.game.ui.showMessage(`Wave ${this.currentWave}`, 2000, '#00ffff');
        }

        return config;
    }

    // Spawn targets based on wave configuration
    spawnWaveTargets(config) {
        if (!this.game.circleManager) return;

        const pattern = this.targetPatterns[config.pattern] || this.targetPatterns.FLOATING;
        const targetCount = Math.min(config.targets, this.game.circleManager.maxCircles);

        // Store pattern info in manager for use during updates
        this.activePattern = pattern;
        this.activeConfig = config;

        // Spawn initial batch
        this.game.circleManager.spawnCircles(Math.min(targetCount, 5));
    }

    // Start warm-up phase
    startWarmup(duration = 5) {
        this.isWarmingUp = true;
        this.warmupTimeRemaining = duration;

        if (this.game.ui) {
            this.game.ui.showMessage('Get Ready!', 1500, '#ffff00');
        }

        console.log(`Warmup started: ${duration} seconds`);
    }

    // End warm-up and start the wave
    endWarmup() {
        this.isWarmingUp = false;
        this.warmupTimeRemaining = 0;

        if (this.game.ui) {
            this.game.ui.showMessage('GO!', 1000, '#00ff00');
        }

        console.log('Warmup ended, starting wave');
        this.startWave();
    }

    // Update called each frame
    update(deltaTime) {
        // Update warmup timer
        if (this.isWarmingUp) {
            this.warmupTimeRemaining -= deltaTime;

            // Update UI with countdown
            if (this.game.ui) {
                const countdown = Math.ceil(this.warmupTimeRemaining);
                if (countdown > 0 && countdown !== this._lastCountdown) {
                    this.game.ui.showMessage(String(countdown), 500, '#ffff00');
                    this._lastCountdown = countdown;
                }
            }

            if (this.warmupTimeRemaining <= 0) {
                this.endWarmup();
            }
            return;
        }

        // Update wave timer
        if (this.waveTimeRemaining > 0) {
            this.waveTimeRemaining -= deltaTime;
            this.roundStats.timeElapsed += deltaTime;

            if (this.waveTimeRemaining <= 0) {
                this.endWave();
            }
        }

        // Update streak timeout
        if (this.streakCount > 0) {
            const timeSinceLastHit = Date.now() - this.lastHitTime;
            if (timeSinceLastHit > this.streakTimeout) {
                this.breakStreak();
            }
        }

        // Update score multiplier based on streak
        this.updateScoreMultiplier();

        // Apply target pattern behavior
        this.updateTargetPatterns(deltaTime);
    }

    // Update target behavior based on active pattern
    updateTargetPatterns(deltaTime) {
        if (!this.game.circleManager || !this.activePattern) return;

        const circles = this.game.circleManager.circles;
        const pattern = this.activePattern;

        circles.forEach(circle => {
            switch (pattern.movement) {
                case 'strafe':
                    this.applyStrafeMovement(circle, deltaTime);
                    break;
                case 'erratic':
                    this.applyErraticMovement(circle, deltaTime);
                    break;
                case 'orbit':
                    this.applyOrbitalMovement(circle, deltaTime);
                    break;
                case 'popup':
                    this.applyPopupBehavior(circle, deltaTime);
                    break;
                // 'float' and 'none' are handled by CircleManager's default behavior
            }
        });
    }

    applyStrafeMovement(circle, deltaTime) {
        if (!circle.userData.strafeData) {
            circle.userData.strafeData = {
                direction: Math.random() > 0.5 ? 1 : -1,
                speed: (2 + Math.random() * 2) * this.difficultyMultiplier,
                range: 5 + Math.random() * 5,
                startX: circle.position.x
            };
        }

        const data = circle.userData.strafeData;
        circle.position.x += data.direction * data.speed * deltaTime;

        // Reverse direction at range limits
        if (Math.abs(circle.position.x - data.startX) > data.range) {
            data.direction *= -1;
        }
    }

    applyErraticMovement(circle, deltaTime) {
        if (!circle.userData.erraticData) {
            circle.userData.erraticData = {
                changeTimer: 0,
                velocityX: 0,
                velocityZ: 0
            };
        }

        const data = circle.userData.erraticData;
        data.changeTimer -= deltaTime;

        if (data.changeTimer <= 0) {
            // Change direction randomly
            data.velocityX = (Math.random() - 0.5) * 6 * this.difficultyMultiplier;
            data.velocityZ = (Math.random() - 0.5) * 6 * this.difficultyMultiplier;
            data.changeTimer = 0.5 + Math.random() * 1.0;
        }

        circle.position.x += data.velocityX * deltaTime;
        circle.position.z += data.velocityZ * deltaTime;
    }

    applyOrbitalMovement(circle, deltaTime) {
        if (!circle.userData.orbitData) {
            circle.userData.orbitData = {
                centerX: circle.position.x,
                centerZ: circle.position.z,
                radius: 3 + Math.random() * 3,
                angle: Math.random() * Math.PI * 2,
                speed: (1 + Math.random()) * this.difficultyMultiplier
            };
        }

        const data = circle.userData.orbitData;
        data.angle += data.speed * deltaTime;

        circle.position.x = data.centerX + Math.cos(data.angle) * data.radius;
        circle.position.z = data.centerZ + Math.sin(data.angle) * data.radius;
    }

    applyPopupBehavior(circle, deltaTime) {
        if (!circle.userData.popupData) {
            const lifetime = this.activeConfig.targetLifetime || 2.0;
            circle.userData.popupData = {
                lifetime: lifetime,
                timeAlive: 0,
                fadeStart: lifetime * 0.7
            };
        }

        const data = circle.userData.popupData;
        data.timeAlive += deltaTime;

        // Fade out near end of life
        if (data.timeAlive > data.fadeStart) {
            const fadeProgress = (data.timeAlive - data.fadeStart) / (data.lifetime - data.fadeStart);
            if (circle.material) {
                circle.material.opacity = 1 - fadeProgress;
            }
        }

        // Destroy if lifetime exceeded
        if (data.timeAlive >= data.lifetime) {
            this.game.circleManager.destroyCircle(circle);
            this.roundStats.targetsMissed++;

            // Spawn replacement
            if (this.game.circleManager.circles.length < (this.activeConfig.targets || 5)) {
                this.game.circleManager.spawnCircle();
            }
        }
    }

    // Handle a successful hit
    onTargetHit(targetType) {
        const now = Date.now();
        const reactionTime = now - this.lastHitTime;

        // Update streak
        this.streakCount++;
        if (this.streakCount > this.maxStreak) {
            this.maxStreak = this.streakCount;
            this.roundStats.maxStreak = this.maxStreak;
        }
        this.lastHitTime = now;

        // Calculate score with multiplier
        const baseScore = 10;
        const streakBonus = Math.min(this.streakCount * 2, 20);
        const multipliedScore = Math.floor((baseScore + streakBonus) * this.scoreMultiplier);

        // Track stats
        this.roundStats.targetsHit++;
        this.roundStats.shotsHired++;
        if (reactionTime < 5000) {
            this.roundStats.reactionTimes.push(reactionTime);
            this.roundStats.averageReactionTime = this.calculateAverageReactionTime();
        }

        // Show streak feedback
        if (this.streakCount >= 3) {
            this.showStreakFeedback();
        }

        return multipliedScore;
    }

    // Handle a missed shot
    onShotMissed() {
        this.roundStats.shotsMissed++;
        this.breakStreak();
    }

    // Break the current streak
    breakStreak() {
        if (this.streakCount > 0) {
            console.log(`Streak broken at ${this.streakCount}`);
            this.streakCount = 0;
            this.scoreMultiplier = 1.0;
        }
    }

    // Update score multiplier based on streak
    updateScoreMultiplier() {
        if (this.streakCount >= 10) {
            this.scoreMultiplier = 2.5;
        } else if (this.streakCount >= 7) {
            this.scoreMultiplier = 2.0;
        } else if (this.streakCount >= 5) {
            this.scoreMultiplier = 1.75;
        } else if (this.streakCount >= 3) {
            this.scoreMultiplier = 1.5;
        } else {
            this.scoreMultiplier = 1.0;
        }
    }

    // Show feedback for streak milestones
    showStreakFeedback() {
        if (!this.game.ui) return;

        let message = '';
        let color = '#ffffff';

        if (this.streakCount === 3) {
            message = 'Nice! x1.5';
            color = '#00ff00';
        } else if (this.streakCount === 5) {
            message = 'Great! x1.75';
            color = '#00ffff';
        } else if (this.streakCount === 7) {
            message = 'Excellent! x2.0';
            color = '#ffff00';
        } else if (this.streakCount === 10) {
            message = 'UNSTOPPABLE! x2.5';
            color = '#ff00ff';
        } else if (this.streakCount > 10 && this.streakCount % 5 === 0) {
            message = `${this.streakCount} STREAK!`;
            color = '#ff0000';
        }

        if (message) {
            this.game.ui.showMessage(message, 1000, color);
        }
    }

    // Calculate average reaction time
    calculateAverageReactionTime() {
        const times = this.roundStats.reactionTimes;
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    // End the current wave
    endWave() {
        console.log(`Wave ${this.currentWave} ended`);

        // Calculate wave stats
        const totalShots = this.roundStats.shotsHired + this.roundStats.shotsMissed;
        this.roundStats.accuracy = totalShots > 0
            ? Math.round((this.roundStats.shotsHired / totalShots) * 100)
            : 0;

        // Check if there are more waves
        if (this.currentWave < this.maxWaves) {
            this.showWaveTransition();
        } else {
            this.endRound();
        }
    }

    // Show transition screen between waves
    showWaveTransition() {
        if (!this.game.ui) {
            this.advanceToNextWave();
            return;
        }

        // Show stats summary
        const stats = this.roundStats;
        const message = `Wave ${this.currentWave} Complete!\n` +
                       `Targets Hit: ${stats.targetsHit}\n` +
                       `Accuracy: ${stats.accuracy}%\n` +
                       `Best Streak: ${stats.maxStreak}`;

        this.game.ui.showMessage(message, 3000, '#00ffff');

        // Advance to next wave after delay
        setTimeout(() => {
            this.advanceToNextWave();
        }, 3500);
    }

    // Advance to the next wave
    advanceToNextWave() {
        this.currentWave++;
        this.startWarmup(3);
    }

    // End the entire round
    endRound() {
        console.log('Round complete!');

        // Calculate final stats
        const finalStats = this.getFinalStats();

        // Notify game
        if (this.game.onRoundComplete) {
            this.game.onRoundComplete(finalStats);
        }

        // Show end screen
        if (this.game.ui) {
            this.game.ui.showEndScreen(this.roundStats.score);
        }
    }

    // Get final stats for the round
    getFinalStats() {
        return {
            ...this.roundStats,
            mode: this.currentMode,
            wavesCompleted: this.currentWave,
            finalMultiplier: this.scoreMultiplier
        };
    }

    // Reset stats for new game
    resetStats() {
        this.roundStats = this.createEmptyStats();
        this.streakCount = 0;
        this.maxStreak = 0;
        this.scoreMultiplier = 1.0;
        this.lastHitTime = 0;
    }

    // Reset level manager for new game
    reset() {
        this.currentWave = 1;
        this.isWarmingUp = false;
        this.warmupTimeRemaining = 0;
        this.waveTimeRemaining = 0;
        this.activePattern = null;
        this.activeConfig = null;
        this.resetStats();
    }

    // Get available game modes
    getAvailableModes() {
        return Object.entries(this.gameModes).map(([key, value]) => ({
            id: value,
            name: this.getModeDisplayName(value),
            description: this.getModeDescription(value)
        }));
    }

    getModeDisplayName(mode) {
        const names = {
            classic: 'Classic',
            flickShot: 'Flick Shot',
            tracking: 'Tracking',
            reaction: 'Reaction',
            precision: 'Precision',
            elimination: 'Elimination',
            survival: 'Survival'
        };
        return names[mode] || mode;
    }

    getModeDescription(mode) {
        const descriptions = {
            classic: 'Hit as many targets as possible within the time limit',
            flickShot: 'Targets appear briefly - react fast and flick to hit them',
            tracking: 'Follow moving targets smoothly for accurate hits',
            reaction: 'Test your reaction speed with sudden target appearances',
            precision: 'Hit smaller targets - accuracy is key',
            elimination: 'Clear all targets in each wave as fast as possible',
            survival: 'Endless mode with increasing difficulty - how long can you last?'
        };
        return descriptions[mode] || '';
    }
}
