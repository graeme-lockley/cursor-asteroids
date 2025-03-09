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
        this.paused = false;
        this.wave = 1;
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
        // Always update asteroids even when game is over
        if (this.gameOver) {
            // Update asteroids only
            const currentTime = performance.now();
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            this.asteroids.forEach(asteroid => asteroid.update(deltaTime, this.canvas.width, this.canvas.height));
            
            // Render everything
            this.render();
        } else if (!this.paused) {
            this.update();
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Update ship with input and delta time
        this.ship.update(deltaTime, keys, this.canvas.width, this.canvas.height);
        
        // Handle shooting
        if (keys.space && this.ship.shootTimer <= 0) {
            const bullet = this.ship.shoot();
            if (bullet) {
                this.bullets.push(bullet);
                this.audio.playFireSound();
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
            this.bullets.forEach(bullet => bullet.render(this.context));
        }
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
        // Check bullet-asteroid collisions
        this.bullets.forEach(bullet => {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(bullet, asteroid)) {
                    bullet.isDead = true;
                    this.handleAsteroidDestruction(index);
                }
            });
        });
        
        // Check ship-asteroid collisions if ship is not invulnerable
        if (!this.ship.isInvulnerable) {
            this.asteroids.forEach((asteroid, index) => {
                if (checkCollision(this.ship, asteroid)) {
                    this.lives--;
                    this.ship.reset(this.canvas.width / 2, this.canvas.height / 2);  // Reset ship position
                    this.handleAsteroidDestruction(index);
                    
                    if (this.lives <= 0) {
                        this.gameOver = true;
                        document.getElementById('game-over-screen').classList.add('visible');
                        document.getElementById('final-score').textContent = this.score;
                    }
                }
            });
        }
    }
    
    handleAsteroidDestruction(index) {
        const asteroid = this.asteroids[index];
        
        // Play explosion sound
        this.audio.playBangSound(asteroid.size);
        
        // Update score based on asteroid size
        switch (asteroid.size) {
            case 'large':
                this.score += 20;
                break;
            case 'medium':
                this.score += 50;
                break;
            case 'small':
                this.score += 100;
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
        
        // Check if all asteroids are destroyed
        if (this.asteroids.length === 0) {
            this.wave++;
            this.createNewWave();
            this.audio.startBackgroundBeat(this.wave);
        }
    }
    
    createNewWave() {
        // Clear existing asteroids
        this.asteroids = [];
        
        // Create new asteroids based on wave number
        const numAsteroids = 3 + this.wave;  // Increase asteroids with each wave
        for (let i = 0; i < numAsteroids; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const angle = Math.random() * Math.PI * 2;
            this.asteroids.push(new Asteroid(x, y, 'large', 2, angle));
        }
    }
} 