import Game from '../src/game.js';
import Ship from '../src/ship.js';
import Asteroid from '../src/asteroid.js';

// Mock canvas and context
const mockContext = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    arc: () => {},
    getContext: () => mockContext,
};

const mockCanvas = {
    width: 800,
    height: 600,
    getContext: () => mockContext,
    getBoundingClientRect: () => ({
        width: 800,
        height: 600
    })
};

describe('Game', () => {
    let game;
    
    beforeEach(() => {
        game = new Game(mockCanvas);
    });
    
    describe('initialization', () => {
        test('initializes with correct state', () => {
            expect(game.score).toBe(0);
            expect(game.lives).toBe(3);
            expect(game.gameOver).toBe(false);
            expect(game.paused).toBe(false);
            expect(game.ship).toBeTruthy();
            expect(game.asteroids.length).toBeGreaterThan(0);
            expect(game.bullets.length).toBe(0);
        });
    });
    
    describe('collision handling', () => {
        test('splits asteroid when hit by bullet', () => {
            // Create a large asteroid at a specific position
            const asteroid = new Asteroid(400, 300, 'large');
            game.asteroids = [asteroid];
            
            // Create a bullet that will hit the asteroid
            game.bullets = [{
                x: asteroid.x,
                y: asteroid.y,
                radius: 2,
                isDead: false
            }];
            
            // Store the initial bullet state
            const initialBulletState = game.bullets[0].isDead;
            
            // Check collisions
            game.checkCollisions();
            
            // Verify asteroid was split into two medium asteroids
            expect(game.asteroids.length).toBe(2);
            expect(game.asteroids[0].size).toBe('medium');
            expect(game.asteroids[1].size).toBe('medium');
            expect(game.bullets[0].isDead).toBe(true);
            expect(initialBulletState).toBe(false);
        });
        
        test('splits asteroid when hit by ship', () => {
            // Create a large asteroid at a specific position
            const asteroid = new Asteroid(400, 300, 'large');
            game.asteroids = [asteroid];
            
            // Position ship to collide with asteroid
            game.ship.x = asteroid.x;
            game.ship.y = asteroid.y;
            game.ship.isInvulnerable = false;
            
            // Store initial lives
            const initialLives = game.lives;
            
            // Check collisions
            game.checkCollisions();
            
            // Verify asteroid was split and ship lost a life
            expect(game.asteroids.length).toBe(2);
            expect(game.asteroids[0].size).toBe('medium');
            expect(game.asteroids[1].size).toBe('medium');
            expect(game.lives).toBe(initialLives - 1);
            expect(game.ship.isInvulnerable).toBe(true);
        });
        
        test('destroys small asteroid without splitting', () => {
            // Create a small asteroid
            game.asteroids = [new Asteroid(400, 300, 'small')];
            
            // Create a bullet that will hit the asteroid
            game.bullets = [{
                x: 400,
                y: 300,
                radius: 2,
                isDead: false
            }];
            
            // Check collisions
            game.checkCollisions();
            
            // Verify asteroid was destroyed without splitting
            expect(game.asteroids.length).toBeGreaterThan(0); // New wave spawned
            expect(game.bullets[0].isDead).toBe(true);
        });
        
        test('creates new wave when all asteroids are destroyed', () => {
            // Create a single small asteroid
            game.asteroids = [new Asteroid(400, 300, 'small')];
            
            // Create a bullet that will hit the asteroid
            game.bullets = [{
                x: 400,
                y: 300,
                radius: 2,
                isDead: false
            }];
            
            // Check collisions
            game.checkCollisions();
            
            // Verify new wave was created
            expect(game.asteroids.length).toBeGreaterThan(0);
            expect(game.asteroids[0].size).toBe('large');
        });
        
        test('invulnerable ship does not trigger collision', () => {
            // Create an asteroid
            game.asteroids = [new Asteroid(400, 300, 'large')];
            
            // Position ship to collide with asteroid but make it invulnerable
            game.ship.x = 400;
            game.ship.y = 300;
            game.ship.isInvulnerable = true;
            
            // Store initial state
            const initialLives = game.lives;
            const initialAsteroidCount = game.asteroids.length;
            
            // Check collisions
            game.checkCollisions();
            
            // Verify no changes occurred
            expect(game.lives).toBe(initialLives);
            expect(game.asteroids.length).toBe(initialAsteroidCount);
        });
    });
}); 