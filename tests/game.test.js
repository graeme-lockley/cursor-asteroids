/**
 * @jest-environment jsdom
 */

import Game from '../src/game.js';
import Ship from '../src/ship.js';
import Asteroid from '../src/asteroid.js';

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.state = 'suspended';
    }
    
    createBufferSource() {
        return {
            connect: jest.fn(),
            disconnect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            buffer: null,
            onended: null
        };
    }
    
    createGain() {
        return {
            connect: jest.fn(),
            gain: { value: 1 }
        };
    }
    
    decodeAudioData(buffer) {
        return Promise.resolve({});
    }
    
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
}

// Mock fetch for audio file loading
global.fetch = jest.fn(() =>
    Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
);

global.window = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext
};

// Mock requestAnimationFrame to execute immediately
global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
    cb();
    return 1;
});

// Mock performance.now()
global.performance = {
    now: () => Date.now()
};

// Mock canvas context
const mockContext = {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    arc: jest.fn(),
    fillText: jest.fn(),
    font: '',
    textAlign: 'left'
};

describe('Game', () => {
    let game;
    let canvas;
    let scoreElement;
    let livesElement;
    let gameOverScreen;
    let finalScoreElement;
    
    beforeEach(async () => {
        // Set up document body
        document.body.innerHTML = `
            <canvas id="gameCanvas" width="800" height="600"></canvas>
            <div id="score">0</div>
            <div id="lives">3</div>
            <div id="game-over-screen"></div>
            <div id="final-score">0</div>
        `;
        
        // Get elements
        canvas = document.getElementById('gameCanvas');
        canvas.width = 800;
        canvas.height = 600;
        scoreElement = document.getElementById('score');
        livesElement = document.getElementById('lives');
        gameOverScreen = document.getElementById('game-over-screen');
        finalScoreElement = document.getElementById('final-score');
        
        // Mock canvas context and getBoundingClientRect
        canvas.getContext = jest.fn().mockReturnValue(mockContext);
        canvas.getBoundingClientRect = jest.fn().mockReturnValue({
            width: 800,
            height: 600,
            top: 0,
            left: 0,
            right: 800,
            bottom: 600
        });
        
        // Create game instance with test mode enabled
        game = new Game(canvas, true);
        
        // Wait for audio initialization
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    afterEach(() => {
        // Clean up DOM elements
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Stop game loop if running
        if (game) {
            game.stop();
        }
    });
    
    describe('collision handling', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('splits asteroid when hit by ship', () => {
            // Set up initial state
            game.asteroids = [new Asteroid(400, 300, 'large')];
            const initialAsteroidCount = game.asteroids.length;
            
            // Force collision
            game.ship.x = game.asteroids[0].x;
            game.ship.y = game.asteroids[0].y;
            
            game.checkCollisions();
            
            // Original asteroid is removed and two medium asteroids are created
            expect(game.asteroids.length).toBe(2);  // Two medium asteroids
            expect(game.asteroids.filter(a => a.size === 'medium').length).toBe(2);
            expect(game.asteroids.filter(a => a.size === 'large').length).toBe(0);
        });
        
        test('hides ship immediately when last life is lost', () => {
            // Set up game with one life
            game.lives = 1;
            game.asteroids = [new Asteroid(400, 300, 'large')];
            
            // Force fatal collision
            game.ship.x = game.asteroids[0].x;
            game.ship.y = game.asteroids[0].y;
            game.ship.isInvulnerable = false;
            
            // Update game to trigger collision
            game.checkCollisions();
            
            // Ship should be in pending game over state
            expect(game.gameOverPending).toBe(true);
            expect(game.lives).toBe(0);
            
            // Render and check that ship is not drawn
            const renderSpy = jest.spyOn(game.ship, 'render');
            game.render();
            expect(renderSpy).not.toHaveBeenCalled();
        });
        
        test('keeps ship hidden during game over delay', () => {
            // Set up game with one life
            game.lives = 1;
            game.asteroids = [new Asteroid(400, 300, 'large')];
            
            // Force fatal collision
            game.ship.x = game.asteroids[0].x;
            game.ship.y = game.asteroids[0].y;
            game.ship.isInvulnerable = false;
            
            // Update game to trigger collision
            game.checkCollisions();
            
            // Ship should be hidden immediately
            const renderSpy = jest.spyOn(game.ship, 'render');
            game.render();
            expect(renderSpy).not.toHaveBeenCalled();
            expect(game.gameOverPending).toBe(true);
            expect(game.gameOver).toBe(false);
            
            // Advance timer to complete the delay
            jest.advanceTimersByTime(3000);
            
            // Ship should still be hidden and game should be over
            game.render();
            expect(renderSpy).not.toHaveBeenCalled();
            expect(game.gameOver).toBe(true);
        });
        
        test('destroys small asteroid without splitting', () => {
            const smallAsteroid = game.asteroids[0];
            smallAsteroid.size = 'small';
            const initialAsteroidCount = game.asteroids.length;
            
            // Force collision
            game.ship.x = smallAsteroid.x;
            game.ship.y = smallAsteroid.y;
            
            game.checkCollisions();
            
            // Should remove the small asteroid without creating new ones
            expect(game.asteroids.length).toBe(initialAsteroidCount - 1);
        });
        
        test('creates new wave when all asteroids are destroyed', () => {
            // Clear all asteroids except one
            game.asteroids = [game.asteroids[0]];
            game.asteroids[0].size = 'small';
            const initialWave = game.wave;
            
            // Force collision to destroy last asteroid
            game.ship.x = game.asteroids[0].x;
            game.ship.y = game.asteroids[0].y;
            
            game.checkCollisions();
            
            // Should increment wave number
            expect(game.wave).toBe(initialWave + 1);
            
            // Advance timer to allow new wave to be created
            jest.advanceTimersByTime(3000);
            
            // Should have created new asteroids
            expect(game.asteroids.length).toBeGreaterThan(0);
        });
        
        test('invulnerable ship does not trigger collision', () => {
            const asteroid = game.asteroids[0];
            const initialLives = game.lives;
            game.ship.isInvulnerable = true;
            
            // Force collision
            game.ship.x = asteroid.x;
            game.ship.y = asteroid.y;
            
            game.checkCollisions();
            
            // Should not lose a life
            expect(game.lives).toBe(initialLives);
        });
    });
    
    describe('wave progression', () => {
        test('increases number of asteroids after clearing a wave', () => {
            game.wave = 1;
            const wave1Count = game.asteroids.length;
            
            game.wave = 2;
            game.createNewWave();
            const wave2Count = game.asteroids.length;
            
            expect(wave2Count).toBe(5);  // 3 + wave 2 = 5 asteroids
            expect(wave2Count).toBeGreaterThan(wave1Count);
        });
        
        test('resets wave number when game is reset', () => {
            game.wave = 5;
            game.reset();
            expect(game.wave).toBe(1);
        });
        
        test('correctly calculates asteroids for each wave', () => {
            game.wave = 1;
            const wave1Count = game.asteroids.length;
            
            game.wave = 2;
            game.createNewWave();
            const wave2Count = game.asteroids.length;
            
            game.wave = 3;
            game.createNewWave();
            const wave3Count = game.asteroids.length;
            
            expect(wave1Count).toBe(4);  // 3 + wave 1 = 4 asteroids
            expect(wave2Count).toBe(5);  // 3 + wave 2 = 5 asteroids
            expect(wave3Count).toBe(6);  // 3 + wave 3 = 6 asteroids
        });
    });
}); 