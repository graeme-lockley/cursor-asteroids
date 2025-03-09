import Ship from './ship.js';
import Asteroid from './asteroid.js';
import { checkCollision } from './collision.js';
import { setupInput, keys } from './input.js';
import AudioManager from './audio.js';

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
        this.gameOverTimer = null;  // Add timer for delayed game over
        
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
        this.lives = 3;
        this.gameOver = false;
        this.gameOverPending = false;  // Add pending state for delayed game over
        if (this.gameOverTimer) {
            clearTimeout(this.gameOverTimer);
            this.gameOverTimer = null;
        }
        this.paused = false;
        this.wave = 1;
        this.initialAsteroidCount = 0;
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2);
        this.asteroids = [];
        this.bullets = [];
        this.audio = new AudioManager(this.isTestMode);
        
        // Create initial asteroids
        this.createNewWave();
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
        window.addEventListener('keydown', (e) => {
            if (this.gameOver) {
                this.reset();
                document.getElementById('game-over-screen').classList.remove('visible');
            }
        });
        
        // Initialize audio on first user interaction
        const startAudio = () => {
            // Resume audio context
            this.audio.context.resume().then(() => {
                // Start background beat
                this.audio.startBackgroundBeat(this.wave);
                
                // Remove event listeners
                document.removeEventListener('keydown', startAudio);
                document.removeEventListener('click', startAudio);
                document.removeEventListener('touchstart', startAudio);
            });
        };
        
        // Add event listeners for user interaction
        document.addEventListener('keydown', startAudio);
        document.addEventListener('click', startAudio);
        document.addEventListener('touchstart', startAudio);
        
        console.log('Starting game loop...');
        
        // Start game loop if not in test mode
        if (!this.isTestMode) {
            this.gameLoop();
        }
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
                // Full update when game is running
                this.update();
            } else {
                // Only update asteroid positions when game is over
                this.asteroids.forEach(asteroid => asteroid.update(deltaTime, this.canvas.width, this.canvas.height));
                
                // Keep wrapping asteroids around screen edges
                this.asteroids.forEach(asteroid => {
                    if (asteroid.x < 0) asteroid.x = this.canvas.width;
                    if (asteroid.x > this.canvas.width) asteroid.x = 0;
                    if (asteroid.y < 0) asteroid.y = this.canvas.height;
                    if (asteroid.y > this.canvas.height) asteroid.y = 0;
                });
            }
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const deltaTime = (performance.now() - this.lastTime) / 1000;
        
        // Only update ship if not in game over pending state
        if (!this.gameOverPending) {
            this.ship.update(deltaTime, keys, this.canvas.width, this.canvas.height);
            
            // Handle shooting
            if (keys.space && this.ship.shootTimer <= 0) {
                const bullet = this.ship.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                    this.audio.playFireSound();
                }
            }
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => !bullet.isDead);
        this.bullets.forEach(bullet => bullet.update(deltaTime, this.canvas.width, this.canvas.height));
        
        // Update asteroids
        this.asteroids.forEach(asteroid => asteroid.update(deltaTime, this.canvas.width, this.canvas.height));
        
        // Check for collisions
        this.checkCollisions();
        
        // Wrap objects around screen edges
        [this.ship, ...this.bullets, ...this.asteroids].forEach(obj => {
            if (obj.x < 0) obj.x = this.canvas.width;
            if (obj.x > this.canvas.width) obj.x = 0;
            if (obj.y < 0) obj.y = this.canvas.height;
            if (obj.y > this.canvas.height) obj.y = 0;
        });
    }
    
    render() {
        // Clear canvas
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render game objects
        if (!this.gameOver) {
            this.ship.render(this.context);
        }
        // Always render bullets and asteroids
        this.bullets.forEach(bullet => bullet.render(this.context));
        this.asteroids.forEach(asteroid => asteroid.render(this.context));
        
        // Update HUD
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        
        // Render game over text
        if (this.gameOver) {
            this.context.fillStyle = 'white';
            this.context.font = '48px Arial';
            this.context.textAlign = 'center';
            this.context.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.context.font = '24px Arial';
            this.context.fillText('Press Any Key to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
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
        
        // Only check ship collisions if not in game over pending state
        if (!this.gameOverPending && !this.ship.isInvulnerable) {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(this.ship, asteroid)) {
                    this.lives--;
                    this.ship.reset(this.canvas.width / 2, this.canvas.height / 2);  // Reset ship position
                    this.handleAsteroidDestruction(index);
                    
                    if (this.lives <= 0) {
                        this.gameOverPending = true;  // Enter pending state
                        this.ship.isInvulnerable = true;  // Make ship invulnerable during pending state
                        
                        // Set timer for actual game over
                        this.gameOverTimer = setTimeout(() => {
                            this.gameOver = true;
                            this.audio.stopAllSounds();
                            document.getElementById('game-over-screen').classList.add('visible');
                            document.getElementById('final-score').textContent = this.score;
                        }, 3000);
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
        
        // Create smaller asteroids if not already at smallest size
        if (asteroid.size !== 'small') {
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
            
            // Play wave end sound (quick double beat)
            this.audio.playWaveEndSound();
            
            // Create new wave after delay
            setTimeout(() => {
                this.createNewWave();
                // Start the background beat for the new wave
                this.audio.startBackgroundBeat(this.wave);
            }, 3000);  // 3 second delay
        }
    }
    
    createNewWave() {
        // Clear existing asteroids
        this.asteroids = [];
        
        // Create new asteroids based on wave number
        const numAsteroids = 3 + this.wave;  // Increase asteroids with each wave
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
} 