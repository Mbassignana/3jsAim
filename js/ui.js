// UI manager - handles menu, scoring, timer, crosshair, and end screen
class UIManager {
    constructor() {
        this.elements = {
            menu: document.getElementById('menu'),
            crosshair: document.getElementById('crosshair'),
            score: document.getElementById('score'),
            timer: document.getElementById('timer'),
            endScreen: document.getElementById('endScreen'),
            finalScore: document.getElementById('finalScore')
        };
        
        this.currentScore = 0;
        this.currentTime = 120;
        
        this.init();
    }
    
    init() {
        // Ensure all UI elements are properly initialized
        this.showMenu();
        console.log('UI Manager initialized');
    }
    
    showMenu() {
        this.hideAllScreens();
        this.elements.menu.style.display = 'block';
        
        // Hide game UI elements
        this.elements.crosshair.classList.add('hidden');
        this.elements.score.classList.add('hidden');
        this.elements.timer.classList.add('hidden');
        
        // Show cursor in menu
        document.body.classList.remove('game-playing');
        
        console.log('Showing main menu');
    }
    
    showGameUI() {
        this.hideAllScreens();
        
        // Show game UI elements
        this.elements.crosshair.classList.remove('hidden');
        this.elements.score.classList.remove('hidden');
        this.elements.timer.classList.remove('hidden');
        
        // Hide cursor during gameplay
        document.body.classList.add('game-playing');
        
        console.log('Showing game UI');
    }
    
    showEndScreen(finalScore) {
        this.hideAllScreens();
        this.elements.endScreen.style.display = 'block';
        
        // Hide game UI elements
        this.elements.crosshair.classList.add('hidden');
        this.elements.score.classList.add('hidden');
        this.elements.timer.classList.add('hidden');
        
        // Show cursor in end screen
        document.body.classList.remove('game-playing');
        
        // Update final score
        this.elements.finalScore.textContent = `Final Score: ${finalScore}`;
        
        // Add performance message based on score
        const performanceMessage = this.getPerformanceMessage(finalScore);
        this.elements.finalScore.innerHTML += `<br><span style="font-size: 18px; color: #ccc;">${performanceMessage}</span>`;
        
        console.log('Showing end screen with score:', finalScore);
    }
    
    hideAllScreens() {
        this.elements.menu.style.display = 'none';
        this.elements.endScreen.style.display = 'none';
    }
    
    updateScore(score) {
        this.currentScore = score;
        this.elements.score.textContent = `Score: ${score}`;
        
        // Add visual feedback for score changes
        this.animateScoreChange();
    }
    
    animateScoreChange() {
        // Add a brief scale animation to the score element
        this.elements.score.style.transform = 'scale(1.1)';
        this.elements.score.style.color = this.currentScore >= 0 ? '#00ff00' : '#ff0000';
        
        setTimeout(() => {
            this.elements.score.style.transform = 'scale(1)';
            this.elements.score.style.color = '#fff';
        }, 200);
    }
    
    updateTimer(timeInSeconds) {
        this.currentTime = timeInSeconds;
        
        // Format time as MM:SS
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.elements.timer.textContent = `Time: ${formattedTime}`;
        
        // Change color when time is running low
        if (timeInSeconds <= 30) {
            this.elements.timer.style.color = '#ff4444';
            
            // Pulse effect when very low on time
            if (timeInSeconds <= 10) {
                this.elements.timer.style.animation = 'pulse 1s infinite';
            }
        } else {
            this.elements.timer.style.color = '#fff';
            this.elements.timer.style.animation = 'none';
        }
    }
    
    getPerformanceMessage(score) {
        if (score >= 100) {
            return "🏆 Exceptional! Sharpshooter!";
        } else if (score >= 80) {
            return "🎯 Excellent! Great accuracy!";
        } else if (score >= 60) {
            return "👍 Good job! Keep practicing!";
        } else if (score >= 40) {
            return "😐 Not bad, room for improvement";
        } else if (score >= 20) {
            return "😅 Better luck next time!";
        } else if (score >= 0) {
            return "🎮 Practice makes perfect!";
        } else {
            return "🐷 Maybe avoid the animals next time?";
        }
    }
    
    // Show temporary messages (for hits, misses, etc.)
    showMessage(text, duration = 2000, color = '#fff') {
        // Create or update message element
        let messageElement = document.getElementById('gameMessage');
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'gameMessage';
            messageElement.style.cssText = `
                position: absolute;
                top: 70%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 24px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                pointer-events: none;
                z-index: 200;
                transition: opacity 0.3s ease;
            `;
            document.getElementById('ui').appendChild(messageElement);
        }
        
        messageElement.textContent = text;
        messageElement.style.color = color;
        messageElement.style.opacity = '1';
        
        // Clear any existing timeout
        if (messageElement.timeout) {
            clearTimeout(messageElement.timeout);
        }
        
        // Hide message after duration
        messageElement.timeout = setTimeout(() => {
            messageElement.style.opacity = '0';
        }, duration);
    }
    
    // Show hit indicator at screen position
    showHitIndicator(x, y, isPositive = true) {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            color: ${isPositive ? '#00ff00' : '#ff0000'};
            font-size: 20px;
            font-weight: bold;
            pointer-events: none;
            z-index: 150;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        indicator.textContent = isPositive ? '+10' : '-1';
        
        document.getElementById('ui').appendChild(indicator);
        
        // Animate indicator
        let opacity = 1;
        let yOffset = 0;
        
        const animate = () => {
            opacity -= 0.02;
            yOffset -= 2;
            
            indicator.style.opacity = opacity;
            indicator.style.transform = `translateY(${yOffset}px)`;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                document.getElementById('ui').removeChild(indicator);
            }
        };
        
        animate();
    }
    
    // Update crosshair style based on what's being aimed at
    updateCrosshair(targetType = null) {
        const crosshair = this.elements.crosshair;
        
        // Reset classes
        crosshair.className = '';
        
        if (targetType === 'circle') {
            crosshair.style.borderColor = '#00ff00';
            crosshair.style.boxShadow = '0 0 15px rgba(0,255,0,0.8)';
        } else if (targetType === 'npc') {
            crosshair.style.borderColor = '#ff0000';
            crosshair.style.boxShadow = '0 0 15px rgba(255,0,0,0.8)';
        } else {
            crosshair.style.borderColor = '#fff';
            crosshair.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        }
    }
    
    // Add recoil effect to crosshair
    addRecoilEffect() {
        const crosshair = this.elements.crosshair;
        const originalTransform = crosshair.style.transform;
        
        // Apply recoil offset
        crosshair.style.transform = originalTransform + ' translate(2px, -3px)';
        
        // Return to normal after short delay
        setTimeout(() => {
            crosshair.style.transform = originalTransform;
        }, 100);
    }
    
    // Show loading screen
    showLoading(message = 'Loading...') {
        let loadingElement = document.getElementById('loadingScreen');
        
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loadingScreen';
            loadingElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                color: #fff;
                font-size: 24px;
                z-index: 1000;
            `;
            document.getElementById('gameContainer').appendChild(loadingElement);
        }
        
        loadingElement.textContent = message;
        loadingElement.style.display = 'flex';
    }
    
    hideLoading() {
        const loadingElement = document.getElementById('loadingScreen');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
    
    // Damage indicator when player is hurt (if implemented)
    showDamageIndicator() {
        const damage = document.createElement('div');
        damage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, transparent 30%, rgba(255,0,0,0.3) 100%);
            pointer-events: none;
            z-index: 50;
            animation: damageFlash 0.5s ease-out;
        `;
        
        // Add CSS animation
        if (!document.getElementById('damageAnimation')) {
            const style = document.createElement('style');
            style.id = 'damageAnimation';
            style.textContent = `
                @keyframes damageFlash {
                    0% { opacity: 0.8; }
                    100% { opacity: 0; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.getElementById('ui').appendChild(damage);
        
        setTimeout(() => {
            if (damage.parentNode) {
                damage.parentNode.removeChild(damage);
            }
        }, 500);
    }
    
    // Get current UI state
    getCurrentState() {
        if (this.elements.menu.style.display !== 'none') {
            return 'menu';
        } else if (this.elements.endScreen.style.display !== 'none') {
            return 'endScreen';
        } else {
            return 'game';
        }
    }
    
    // Cleanup method
    cleanup() {
        // Remove any temporary UI elements
        const gameMessage = document.getElementById('gameMessage');
        if (gameMessage) {
            gameMessage.remove();
        }
        
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.remove();
        }
        
        console.log('UI Manager cleaned up');
    }
}