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
        // Create initial asteroids
        this.createAsteroids(4);
        
        console.log('Starting game loop...');
        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
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
            bullet.update(deltaTime);
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
        // Check bullet-asteroid collisions
        this.bullets.forEach(bullet => {
            this.asteroids.forEach((asteroid, asteroidIndex) => {
                if (checkCollision(bullet, asteroid)) {
                    bullet.isDead = true;
                    this.splitAsteroid(asteroidIndex);
                }
            });
        });
        
        // Check ship-asteroid collisions
        if (!this.ship.isInvulnerable) {
            this.asteroids.forEach(asteroid => {
                if (checkCollision(this.ship, asteroid)) {
                    this.handleShipCollision();
                }
            });
        }
    }
    
    splitAsteroid(index) {
        const asteroid = this.asteroids[index];
        this.score += this.getAsteroidScore(asteroid.size);
        
        if (asteroid.size !== 'small') {
            const newSize = asteroid.size === 'large' ? 'medium' : 'small';
            for (let i = 0; i < 2; i++) {
                this.asteroids.push(
                    new Asteroid(asteroid.x, asteroid.y, newSize)
                );
            }
        }
        
        this.asteroids.splice(index, 1);
        
        // Create new asteroids if all are destroyed
        if (this.asteroids.length === 0) {
            this.createAsteroids(4);
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
        this.asteroids = [];
        this.bullets = [];
        this.ship.reset(this.width / 2, this.height / 2);
        this.createAsteroids(4);
        document.getElementById('game-over-screen').classList.add('hidden');
    }
} 