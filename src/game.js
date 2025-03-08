import Ship from './ship.js';
import Asteroid from './asteroid.js';
import { checkCollision } from './collision.js';
import { setupInput, keys } from './input.js';

export default class Game {
    constructor(canvas) {
        console.log('Game constructor called with canvas:', {
            width: canvas.width,
            height: canvas.height
        });
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set initial dimensions
        this.resize();
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.paused = false;
        this.wave = 1;  // Track the current wave number
        
        // Game objects
        this.ship = new Ship(this.width / 2, this.height / 2);
        this.asteroids = [];
        this.bullets = [];
        
        // Initialize input handling
        setupInput();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.resize = this.resize.bind(this);
        
        // Add resize listener
        window.addEventListener('resize', this.resize);
        
        // Start game
        this.init();
        
        console.log('Game initialization complete');
    }
    
    resize() {
        // Get the display size of the canvas
        const rect = this.canvas.getBoundingClientRect();
        
        // Set the canvas resolution to match its display size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update game dimensions
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        console.log('Canvas resized to:', {
            width: this.width,
            height: this.height
        });
    }
    
    init() {
        console.log('Creating initial asteroids...');
        // Create initial asteroids based on wave number
        this.createAsteroids(this.getAsteroidsForWave());
        
        console.log('Starting game loop...');
        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }
    
    getAsteroidsForWave() {
        // Start with 4 asteroids and add 1 for each wave
        return 3 + this.wave;
    }
    
    createAsteroids(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            // Ensure asteroids don't spawn too close to the ship
            if (Math.hypot(x - this.ship.x, y - this.ship.y) > 100) {
                this.asteroids.push(new Asteroid(x, y, 'large'));
            } else {
                i--; // Try again
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameOver || this.paused) return;
        
        // Update ship
        this.ship.update(deltaTime, keys, this.width, this.height);
        
        // Handle shooting
        if (keys.space) {
            const bullet = this.ship.shoot();
            if (bullet) {
                this.bullets.push(bullet);
            }
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime, this.width, this.height);
            return !bullet.isDead;
        });
        
        // Update asteroids
        this.asteroids.forEach(asteroid => {
            asteroid.update(deltaTime, this.width, this.height);
        });
        
        // Check collisions
        this.checkCollisions();
    }
    
    checkCollisions() {
        const asteroidsToDestroy = new Set();
        
        // Check bullet-asteroid collisions
        this.bullets.forEach(bullet => {
            if (!bullet.isDead) {  // Only check live bullets
                for (let i = 0; i < this.asteroids.length; i++) {
                    if (!asteroidsToDestroy.has(i) && checkCollision(bullet, this.asteroids[i])) {
                        bullet.isDead = true;
                        asteroidsToDestroy.add(i);
                        break;  // Stop checking after first hit
                    }
                }
            }
        });
        
        // Check ship-asteroid collisions
        if (!this.ship.isInvulnerable) {
            for (let i = 0; i < this.asteroids.length; i++) {
                if (!asteroidsToDestroy.has(i) && checkCollision(this.ship, this.asteroids[i])) {
                    this.handleShipCollision();
                    asteroidsToDestroy.add(i);
                    break;  // Stop checking after first hit
                }
            }
        }
        
        // Process destroyed asteroids in reverse order to maintain correct indices
        Array.from(asteroidsToDestroy)
            .sort((a, b) => b - a)  // Sort in descending order
            .forEach(index => {
                this.handleAsteroidDestruction(index);
            });
    }
    
    handleAsteroidDestruction(asteroidIndex) {
        const asteroid = this.asteroids[asteroidIndex];
        if (asteroid) {
            this.score += this.getAsteroidScore(asteroid.size);
            
            console.log('Original asteroid size:', asteroid.size);
            
            // Create smaller asteroids if not already at smallest size
            const newAsteroids = [];
            if (asteroid.size !== 'small') {
                const newSize = asteroid.size === 'large' ? 'medium' : 'small';
                console.log('Creating new asteroids with size:', newSize);
                for (let i = 0; i < 2; i++) {
                    const newAsteroid = new Asteroid(asteroid.x, asteroid.y, newSize);
                    console.log('New asteroid created with size:', newAsteroid.size);
                    newAsteroids.push(newAsteroid);
                }
            }
            
            // Remove the original asteroid
            this.asteroids.splice(asteroidIndex, 1);
            
            // Add the new asteroids
            this.asteroids.push(...newAsteroids);
            
            console.log('Final asteroid sizes:', this.asteroids.map(a => a.size));
        }
        
        // Create new wave if all asteroids are destroyed
        if (this.asteroids.length === 0) {
            this.wave++;  // Increment wave number
            console.log('Starting wave', this.wave);
            this.createAsteroids(this.getAsteroidsForWave());
        }
    }
    
    getAsteroidScore(size) {
        const scores = {
            large: 20,
            medium: 50,
            small: 100
        };
        return scores[size];
    }
    
    handleShipCollision() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver = true;
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('game-over-screen').classList.remove('hidden');
        } else {
            this.ship.reset(this.width / 2, this.height / 2);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render game objects
        this.ship.render(this.ctx);
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.asteroids.forEach(asteroid => asteroid.render(this.ctx));
        
        // Update HUD
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
    }
    
    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    reset() {
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.wave = 1;  // Reset wave number
        this.asteroids = [];
        this.bullets = [];
        this.ship.reset(this.width / 2, this.height / 2);
        this.createAsteroids(this.getAsteroidsForWave());
        document.getElementById('game-over-screen').classList.add('hidden');
    }
} 