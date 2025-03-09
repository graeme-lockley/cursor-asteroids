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
    EXTRA_LIFE_SCORE: 10000,  // Score needed for an extra life
    DEFAULT_HIGH_SCORE: 7500
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
        this.highScore = GAME_SETTINGS.DEFAULT_HIGH_SCORE;
        
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
    
    async reset() {
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
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this.canvas);
        this.ship.setGameOver(false);  // Ensure ship's game over state is reset
        this.asteroids = [];
        this.bullets = [];
        
        // Initialize audio
        this.audio = new AudioManager(this.isTestMode);
        if (!this.isTestMode) {
            try {
                await this.audio.init();
            } catch (error) {
                console.error('Failed to initialize audio during reset:', error);
            }
        }
        
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
        window.addEventListener('keydown', async () => {
            if (this.gameOver) {
                await this.reset();
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
        const startAudio = async () => {
            if (this.isTestMode) {
                // In test mode, just start the background beat if not game over
                if (!this.gameOver && !this.gameOverPending) {
                    this.audio.startBackgroundBeat(this.wave);
                }
                this.removeAudioListeners(startAudio);
            } else {
                try {
                    console.log('User interaction detected, initializing audio...');
                    
                    // Wait for audio context to resume and initialization to complete
                    if (this.audio.context.state !== 'running') {
                        console.log('Resuming audio context...');
                        await this.audio.context.resume();
                        console.log('Audio context state after resume:', this.audio.context.state);
                    }
                    
                    // Initialize audio if not already done
                    await this.audio.init();
                    
                    if (!this.gameOver && !this.gameOverPending) {
                        console.log('Starting background beat...');
                        this.audio.startBackgroundBeat(this.wave);
                    }
                    
                    // Only remove listeners if initialization was successful
                    if (this.audio.initialized) {
                        console.log('Audio initialized successfully, removing event listeners');
                        this.removeAudioListeners(startAudio);
                    } else {
                        console.warn('Audio initialization not complete, keeping event listeners');
                    }
                } catch (error) {
                    console.error('Failed to initialize audio:', error);
                }
            }
        };
        
        // Add event listeners for user interaction
        console.log('Adding audio event listeners for user interaction');
        document.addEventListener('keydown', startAudio);
        document.addEventListener('click', startAudio);
        document.addEventListener('touchstart', startAudio);
        
        // Also try to initialize on window load
        window.addEventListener('load', () => {
            console.log('Window loaded, checking if we can initialize audio');
            if (this.audio && this.audio.context && !this.audio.initialized) {
                startAudio();
            }
        });
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
        // Render the ship if it's visible, including during game over
        if (this.ship.visible) {
            this.ship.render(this.context);
        }
        this.bullets.forEach(bullet => bullet.render(this.context));
        this.asteroids.forEach(asteroid => asteroid.render(this.context));
    }
    
    renderHUD() {
        // Render player 1 score on the left
        this.context.fillStyle = 'white';
        this.context.font = '20px Arial';
        this.context.textAlign = 'left';
        this.context.fillText(`Player 1  ${this.score}`, 20, 30);
        
        // Render high score in the middle
        this.context.textAlign = 'center';
        this.context.fillText(`High Score  ${this.highScore}`, this.canvas.width / 2, 30);
        
        // Render lives as small ships
        this.renderLives();
    }
    
    renderLives() {
        const shipSpacing = 20;  // Reduced spacing between ships
        const shipSize = 10;     // Size of the life ships
        const startX = 80;       // Increased starting X position
        const startY = 45;       // Moved up closer to score
        
        this.context.strokeStyle = 'white';
        this.context.lineWidth = 1;
        
        // Draw a small ship for each life
        for (let i = 0; i < this.lives; i++) {
            this.context.save();
            this.context.translate(startX + i * shipSpacing, startY);
            this.context.rotate(-Math.PI / 2); // Rotate 90 degrees counterclockwise to face up
            
            // Draw small ship
            this.context.beginPath();
            this.context.moveTo(shipSize, 0);               // Front tip
            this.context.lineTo(-shipSize/2, -shipSize/2);  // Top back
            this.context.lineTo(-shipSize/3, 0);            // Back indent
            this.context.lineTo(-shipSize/2, shipSize/2);   // Bottom back
            this.context.closePath();
            this.context.stroke();
            
            this.context.restore();
        }
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
                    this.handleAsteroidDestruction(asteroid);
                }
            });
        });
        
        // Check ship-asteroid collisions if ship is not invulnerable
        if (!this.ship.isInvulnerable && !this.gameOver) {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(this.ship, asteroid)) {
                    this.lives--;
                    
                    // Stop thrust sound immediately if ship was thrusting
                    if (this.ship.thrust) {
                        this.audio.stopThrustSound();
                    }
                    
                    if (this.lives <= 0) {
                        this.gameOverPending = true;
                        this.ship.startDisintegration();
                        this.ship.setGameOver(true);  // Set ship's game over state
                        this.audio.stopBackgroundBeat(); // Stop background beat immediately
                        
                        setTimeout(() => {
                            this.gameOver = true;
                            this.gameOverPending = false;
                            this.audio.stopBackgroundBeat(); // Ensure background beat is stopped when game over message appears
                            const gameOverScreen = document.getElementById('game-over-screen');
                            document.getElementById('final-score').textContent = this.score;
                            gameOverScreen.classList.add('visible');
                        }, GAME_SETTINGS.GAME_OVER_DELAY);
                        
                        // Handle asteroid destruction after setting game over state
                        this.handleAsteroidDestruction(asteroid);
                    } else {
                        // Start disintegration animation
                        this.ship.startDisintegration();
                        
                        // Handle asteroid destruction
                        this.handleAsteroidDestruction(asteroid);
                    }
                }
            });
        }
    }
    
    handleAsteroidDestruction(asteroid) {
        // Play explosion sound (allow during game over)
        this.audio.playBangSound(asteroid.size);

        // Update score based on asteroid size
        const scores = {
            large: 20,
            medium: 50,
            small: 100
        };
        this.score += scores[asteroid.size];

        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }

        // Check for extra life
        this.checkExtraLife();

        // Create new asteroids based on size if not in game over
        if (!this.gameOverPending && !this.gameOver) {
            if (asteroid.size === 'large') {
                for (let i = 0; i < 2; i++) {
                    this.asteroids.push(new Asteroid(
                        asteroid.x,
                        asteroid.y,
                        'medium',
                        null,
                        null,
                        asteroid.velocity
                    ));
                }
            } else if (asteroid.size === 'medium') {
                for (let i = 0; i < 2; i++) {
                    this.asteroids.push(new Asteroid(
                        asteroid.x,
                        asteroid.y,
                        'small',
                        null,
                        null,
                        asteroid.velocity
                    ));
                }
            }
            // Small asteroids don't create new asteroids when destroyed
        }

        // Remove the original asteroid
        this.asteroids = this.asteroids.filter(a => a !== asteroid);

        // Update beat interval based on remaining asteroids
        this.audio.updateBeatInterval(this.asteroids.length, this.initialAsteroidCount);

        // Check if all asteroids are destroyed
        if (this.asteroids.length === 0 && !this.gameOver && !this.gameOverPending) {
            this.wave++;

            // Stop background beat and play wave end sound
            this.audio.stopBackgroundBeat();
            this.audio.playWaveEndSound();

            // Create new wave after delay
            setTimeout(() => {
                this.createNewWave();
                // Start the background beat for the new wave with a slight delay
                // to ensure the wave end sound has finished, but only if game isn't over
                setTimeout(() => {
                    if (!this.gameOver && !this.gameOverPending) {
                        this.audio.startBackgroundBeat(this.wave);
                    }
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
            
            // Create asteroid with initial speed between 50 and 100
            const speed = Math.random() * 50 + 50;
            this.asteroids.push(new Asteroid(x, y, 'large', speed, angle));
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