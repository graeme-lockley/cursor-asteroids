import Ship from './ship.js';
import Asteroid from './asteroid.js';
import { checkCollision } from './collision.js';
import { setupInput, keys } from './input.js';
import AudioManager from './audio.js';

// Game constants
const GAME_SETTINGS = {
    INITIAL_LIVES: 3,
    GAME_OVER_DELAY: 3000,
    WAVE_CREATION_DELAY: 3000,
    BACKGROUND_BEAT_DELAY: 500,
    BASE_ASTEROIDS: 3,
    EXTRA_LIFE_SCORE: 10000  // Score needed for an extra life
};

export default class Game {
    constructor(canvas, isTestMode = false) {
        console.log('Game constructor called with canvas:', {
            width: canvas.width,
            height: canvas.height
        });
        
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.isTestMode = isTestMode;
        this.lastTime = performance.now();
        this.gameOverTimer = null;
        
        // Create game over screen if it doesn't exist
        if (!document.getElementById('game-over-screen')) {
            const gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'game-over-screen';
            document.body.appendChild(gameOverScreen);
        }
        
        // Initialize game state
        this.reset();
        
        // Set up resize handling
        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        // Initialize game
        this.init();
    }
    
    reset() {
        this.score = 0;
        this.lives = GAME_SETTINGS.INITIAL_LIVES;
        this.gameOver = false;
        this.gameOverPending = false;
        this.clearGameOverTimer();
        this.paused = false;
        this.wave = 1;
        this.initialAsteroidCount = 0;
        this.lastExtraLifeScore = 0;  // Track when the last extra life was awarded
        
        // Hide game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('visible');
        }
        
        // Create game objects
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2);
        this.asteroids = [];
        this.bullets = [];
        this.audio = new AudioManager(this.isTestMode);
        
        // Create initial asteroids
        this.createNewWave();
    }
    
    clearGameOverTimer() {
        if (this.gameOverTimer) {
            clearTimeout(this.gameOverTimer);
            this.gameOverTimer = null;
        }
    }
    
    resize() {
        // Get the display size of the canvas
        const rect = this.canvas.getBoundingClientRect();
        
        // Set the canvas resolution to match its display size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update ship position if needed
        if (this.ship) {
            this.ship.x = Math.min(this.ship.x, this.canvas.width);
            this.ship.y = Math.min(this.ship.y, this.canvas.height);
        }
        
        console.log('Canvas resized to:', {
            width: this.canvas.width,
            height: this.canvas.height
        });
    }
    
    init() {
        console.log('Creating initial asteroids...');
        
        // Set up input handling
        setupInput();
        
        // Add keydown listener for game over restart
        window.addEventListener('keydown', () => {
            if (this.gameOver) {
                this.reset();
                document.getElementById('game-over-screen').classList.remove('visible');
            }
        });
        
        this.setupAudioHandling();
        
        console.log('Starting game loop...');
        
        // Start game loop if not in test mode
        if (!this.isTestMode) {
            this.gameLoop();
        }
    }
    
    setupAudioHandling() {
        const startAudio = () => {
            if (this.isTestMode) {
                // In test mode, just start the background beat
                this.audio.startBackgroundBeat(this.wave);
                this.removeAudioListeners(startAudio);
            } else {
                this.audio.context.resume().then(() => {
                    this.audio.startBackgroundBeat(this.wave);
                    this.removeAudioListeners(startAudio);
                });
            }
        };
        
        // Add event listeners for user interaction
        document.addEventListener('keydown', startAudio);
        document.addEventListener('click', startAudio);
        document.addEventListener('touchstart', startAudio);
    }
    
    removeAudioListeners(handler) {
        document.removeEventListener('keydown', handler);
        document.removeEventListener('click', handler);
        document.removeEventListener('touchstart', handler);
    }
    
    stop() {
        this.paused = true;
        this.audio.stopBackgroundBeat();
    }
    
    gameLoop() {
        // Calculate delta time for consistent motion
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (!this.paused) {
            if (!this.gameOver) {
                this.update(deltaTime);
            } else {
                this.updateGameOver(deltaTime);
            }
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateGameOver(deltaTime) {
        // Only update and wrap asteroids during game over
        this.asteroids.forEach(asteroid => {
            asteroid.update(deltaTime, this.canvas.width, this.canvas.height);
            this.wrapObject(asteroid);
        });
    }
    
    wrapObject(obj) {
        if (obj.x < 0) obj.x = this.canvas.width;
        if (obj.x > this.canvas.width) obj.x = 0;
        if (obj.y < 0) obj.y = this.canvas.height;
        if (obj.y > this.canvas.height) obj.y = 0;
    }
    
    update(deltaTime) {
        this.updateShip(deltaTime);
        this.updateBullets(deltaTime);
        this.updateAsteroids(deltaTime);
        this.checkCollisions();
        
        // Wrap all objects around screen edges
        [this.ship, ...this.bullets, ...this.asteroids].forEach(obj => this.wrapObject(obj));
    }
    
    updateShip(deltaTime) {
        if (this.gameOverPending || this.gameOver) return;
        
        const prevThrust = this.ship.thrust;
        this.ship.update(deltaTime, keys, this.canvas.width, this.canvas.height);
        
        // Handle thrust sound
        if (this.ship.thrust && !prevThrust) {
            this.audio.playThrustSound();
        } else if (!this.ship.thrust && prevThrust) {
            this.audio.stopThrustSound();
        }
        
        // Handle shooting
        if (keys.space && this.ship.shootTimer <= 0) {
            const bullet = this.ship.shoot();
            if (bullet) {
                this.bullets.push(bullet);
                this.audio.playFireSound();
            }
        }
    }
    
    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => !bullet.isDead);
        this.bullets.forEach(bullet => bullet.update(deltaTime, this.canvas.width, this.canvas.height));
    }
    
    updateAsteroids(deltaTime) {
        this.asteroids.forEach(asteroid => asteroid.update(deltaTime, this.canvas.width, this.canvas.height));
    }
    
    render() {
        this.clearCanvas();
        this.renderGameObjects();
        this.renderHUD();
        if (this.gameOver) {
            this.renderGameOver();
        }
    }
    
    clearCanvas() {
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    renderGameObjects() {
        if (!this.gameOver && !this.gameOverPending) {
            this.ship.render(this.context);
        }
        this.bullets.forEach(bullet => bullet.render(this.context));
        this.asteroids.forEach(asteroid => asteroid.render(this.context));
    }
    
    renderHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }
    
    renderGameOver() {
        this.context.fillStyle = 'white';
        this.context.font = '48px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        this.context.font = '24px Arial';
        this.context.fillText('Press Any Key to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    checkCollisions() {
        // Always check bullet-asteroid collisions
        this.bullets.forEach(bullet => {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(bullet, asteroid)) {
                    bullet.isDead = true;
                    this.handleAsteroidDestruction(index);
                }
            });
        });
        
        // Check ship-asteroid collisions if ship is not invulnerable
        if (!this.ship.isInvulnerable && !this.gameOver) {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(this.ship, asteroid)) {
                    this.lives--;
                    
                    if (this.lives <= 0) {
                        this.gameOverPending = true;
                        this.ship.visible = false;
                        this.ship.isInvulnerable = true;
                        setTimeout(() => {
                            this.gameOver = true;
                            this.gameOverPending = false;
                            document.getElementById('game-over-screen').classList.add('visible');
                        }, GAME_SETTINGS.GAME_OVER_DELAY);
                        
                        // Handle asteroid destruction after setting game over state
                        this.handleAsteroidDestruction(index);
                    } else {
                        // Only reset ship position if player still has lives
                        this.ship.isInvulnerable = true;
                        this.ship.reset(this.canvas.width / 2, this.canvas.height / 2);
                        
                        // Handle asteroid destruction
                        this.handleAsteroidDestruction(index);
                    }
                }
            });
        }
    }
    
    handleAsteroidDestruction(index) {
        const asteroid = this.asteroids[index];
        let newAsteroidsCount = 0;
        
        // Play explosion sound
        this.audio.playBangSound(asteroid.size);
        
        // Update score based on asteroid size
        switch (asteroid.size) {
            case 'large':
                this.score += 20;
                newAsteroidsCount = 2;  // Will create 2 medium asteroids
                break;
            case 'medium':
                this.score += 50;
                newAsteroidsCount = 2;  // Will create 2 small asteroids
                break;
            case 'small':
                this.score += 100;
                newAsteroidsCount = 0;  // No new asteroids
                break;
        }
        
        // Check for extra life
        this.checkExtraLife();
        
        // Create smaller asteroids if not already at smallest size and not in game over
        if (asteroid.size !== 'small' && !this.gameOverPending && !this.gameOver) {
            const newSize = asteroid.size === 'large' ? 'medium' : 'small';
            for (let i = 0; i < 2; i++) {
                const angle = (Math.PI * 2 * i) / 2;
                const newAsteroid = new Asteroid(
                    asteroid.x,
                    asteroid.y,
                    newSize,
                    asteroid.speed * 1.5,
                    angle
                );
                this.asteroids.push(newAsteroid);
            }
        }
        
        // Remove the original asteroid
        this.asteroids.splice(index, 1);
        
        // Update beat interval based on remaining asteroids
        // Count total asteroids including those that will be created
        const totalAsteroids = this.asteroids.length + newAsteroidsCount;
        this.audio.updateBeatInterval(totalAsteroids, this.initialAsteroidCount);
        
        // Check if all asteroids are destroyed
        if (this.asteroids.length === 0) {
            this.wave++;
            
            // Stop background beat and play wave end sound
            this.audio.stopBackgroundBeat();
            this.audio.playWaveEndSound();
            
            // Create new wave after delay
            setTimeout(() => {
                this.createNewWave();
                // Start the background beat for the new wave with a slight delay
                // to ensure the wave end sound has finished
                setTimeout(() => {
                    this.audio.startBackgroundBeat(this.wave);
                }, GAME_SETTINGS.BACKGROUND_BEAT_DELAY);
            }, GAME_SETTINGS.WAVE_CREATION_DELAY);
        }
    }
    
    createNewWave() {
        // Clear existing asteroids
        this.asteroids = [];
        
        // Create new asteroids based on wave number
        const numAsteroids = GAME_SETTINGS.BASE_ASTEROIDS + this.wave;  // Increase asteroids with each wave
        this.initialAsteroidCount = numAsteroids;  // Store initial count
        
        for (let i = 0; i < numAsteroids; i++) {
            // Calculate position on the perimeter
            let x, y;
            const side = Math.floor(Math.random() * 4);  // 0: top, 1: right, 2: bottom, 3: left
            
            switch (side) {
                case 0:  // Top
                    x = Math.random() * this.canvas.width;
                    y = 0;
                    break;
                case 1:  // Right
                    x = this.canvas.width;
                    y = Math.random() * this.canvas.height;
                    break;
                case 2:  // Bottom
                    x = Math.random() * this.canvas.width;
                    y = this.canvas.height;
                    break;
                case 3:  // Left
                    x = 0;
                    y = Math.random() * this.canvas.height;
                    break;
            }
            
            // Calculate angle to point somewhat towards the center
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const angleToCenter = Math.atan2(centerY - y, centerX - x);
            // Add some randomness to the angle (±45 degrees)
            const angle = angleToCenter + (Math.random() - 0.5) * Math.PI / 2;
            
            this.asteroids.push(new Asteroid(x, y, 'large', 2, angle));
        }
    }
    
    checkExtraLife() {
        // Check if player has earned an extra life
        const extraLivesEarned = Math.floor(this.score / GAME_SETTINGS.EXTRA_LIFE_SCORE);
        const newExtraLives = extraLivesEarned - Math.floor(this.lastExtraLifeScore / GAME_SETTINGS.EXTRA_LIFE_SCORE);
        
        if (newExtraLives > 0) {
            this.lives += newExtraLives;
            this.lastExtraLifeScore = extraLivesEarned * GAME_SETTINGS.EXTRA_LIFE_SCORE;
            this.audio.playExtraLifeSound();
        }
    }
} 