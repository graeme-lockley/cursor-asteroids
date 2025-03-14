/**
 * @jest-environment jsdom
 */

import Game from '../src/game.js';
import Ship from '../src/ship.js';
import Asteroid from '../src/asteroid.js';

// Game constants
const GAME_SETTINGS = {
    INITIAL_LIVES: 3,
    GAME_OVER_DELAY: 3000,
    WAVE_CREATION_DELAY: 3000,
    BACKGROUND_BEAT_DELAY: 500,
    BASE_ASTEROIDS: 3,
    DEFAULT_HIGH_SCORE: 7500
};

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

// Mock input module
jest.mock('../src/input.js', () => ({
    keys: {
        left: false,
        right: false,
        up: false,
        space: false
    },
    setupInput: jest.fn()
}));

import { keys } from '../src/input.js';

describe('Game', () => {
    let game;
    let canvas;
    let gameOverScreen;

    beforeEach(() => {
        // Set up document body
        document.body.innerHTML = `
            <div id="game-over-screen"></div>
        `;
        
        // Set up canvas
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.getContext = () => mockContext;
        canvas.getBoundingClientRect = () => ({
            width: 800,
            height: 600,
            top: 0,
            left: 0,
            right: 800,
            bottom: 600
        });
        
        // Get game over screen and set up classList
        gameOverScreen = document.getElementById('game-over-screen');
        const classListState = { visible: false };
        gameOverScreen.classList = {
            add: jest.fn().mockImplementation(className => {
                if (className === 'visible') classListState.visible = true;
            }),
            remove: jest.fn().mockImplementation(className => {
                if (className === 'visible') classListState.visible = false;
            }),
            contains: jest.fn().mockImplementation(className => 
                className === 'visible' ? classListState.visible : false
            )
        };
        
        // Initialize game with test mode
        game = new Game(canvas, true);
        game.init();
        
        // Reset mocks
        jest.clearAllMocks();
        
        // Set up fake timers
        jest.useFakeTimers();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.useRealTimers();
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
            
            // Force collision with a vulnerable ship
            game.ship.isInvulnerable = false;  // Make ship vulnerable for test
            game.ship.x = game.asteroids[0].x;
            game.ship.y = game.asteroids[0].y;
            
            game.checkCollisions();
            
            // Original asteroid is removed and two medium asteroids are created
            expect(game.asteroids.length).toBe(2);  // Two medium asteroids
            expect(game.asteroids.filter(a => a.size === 'medium').length).toBe(2);
            expect(game.asteroids.filter(a => a.size === 'large').length).toBe(0);
        });
        
        test('shows ship disintegrating when last life is lost', () => {
            game.lives = 1;
            const asteroid = new Asteroid(game.ship.x, game.ship.y, 'large');
            game.asteroids = [asteroid];
            
            // Make ship vulnerable and trigger collision
            game.ship.isInvulnerable = false;  // Make ship vulnerable for test
            game.checkCollisions();
            
            // Ship should be visible and disintegrating
            const renderSpy = jest.spyOn(game.ship, 'render');
            game.render();
            expect(renderSpy).toHaveBeenCalled();
            expect(game.ship.isDisintegrating).toBe(true);
            expect(game.ship.visible).toBe(true);
        });
        
        test('keeps ship visible during game over delay until disintegration completes', () => {
            game.lives = 1;
            const asteroid = new Asteroid(game.ship.x, game.ship.y, 'large');
            game.asteroids = [asteroid];
            
            // Make ship vulnerable and trigger collision
            game.ship.isInvulnerable = false;  // Make ship vulnerable for test
            game.checkCollisions();
            
            // Ship should be visible and disintegrating during game over delay
            const renderSpy = jest.spyOn(game.ship, 'render');
            game.render();
            expect(renderSpy).toHaveBeenCalled();
            expect(game.ship.isDisintegrating).toBe(true);
            expect(game.ship.visible).toBe(true);
            expect(game.gameOverPending).toBe(true);
            expect(game.gameOver).toBe(false);
            
            // After disintegration completes, ship should be hidden
            game.ship.disintegrationTimer = 2.1;  // Past the 2 second disintegration time
            game.ship.updateDisintegration(0.1);
            expect(game.ship.visible).toBe(false);
        });
        
        test('destroys small asteroid without splitting', () => {
            const smallAsteroid = game.asteroids[0];
            smallAsteroid.size = 'small';
            const initialAsteroidCount = game.asteroids.length;
            
            // Force collision with a vulnerable ship
            game.ship.isInvulnerable = false;  // Make ship vulnerable for test
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
            
            // Force collision with a vulnerable ship
            game.ship.isInvulnerable = false;  // Make ship vulnerable for test
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
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

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

        test('handles background beat correctly during wave transition', () => {
            // Spy on audio methods
            const stopBackgroundBeatSpy = jest.spyOn(game.audio, 'stopBackgroundBeat');
            const startBackgroundBeatSpy = jest.spyOn(game.audio, 'startBackgroundBeat');
            const playWaveEndSoundSpy = jest.spyOn(game.audio, 'playWaveEndSound');
            
            // Clear all asteroids except one small one
            const lastAsteroid = new Asteroid(400, 300, 'small');
            game.asteroids = [lastAsteroid];
            const initialWave = game.wave;
            
            // Destroy the last asteroid
            game.handleAsteroidDestruction(lastAsteroid);
            
            // Wave end sound should play and background beat should stop
            expect(playWaveEndSoundSpy).toHaveBeenCalled();
            expect(stopBackgroundBeatSpy).toHaveBeenCalled();
            
            // Background beat should not restart immediately
            expect(startBackgroundBeatSpy).not.toHaveBeenCalled();
            
            // Advance timer by 3 seconds (wave creation delay)
            jest.advanceTimersByTime(3000);
            
            // New wave should be created but background beat should not start yet
            expect(game.wave).toBe(initialWave + 1);
            expect(startBackgroundBeatSpy).not.toHaveBeenCalled();
            
            // Advance timer by 0.5 seconds (background beat delay)
            jest.advanceTimersByTime(500);
            
            // Now the background beat should start
            expect(startBackgroundBeatSpy).toHaveBeenCalledWith(initialWave + 1);
        });
    });
    
    describe('sound handling', () => {
        test('plays thrust sound when thrust is activated', () => {
            const playThrustSpy = jest.spyOn(game.audio, 'playThrustSound');
            const stopThrustSpy = jest.spyOn(game.audio, 'stopThrustSound');
            
            // Set initial state
            keys.up = false;
            game.update(0.016);
            
            // Simulate thrust key press
            keys.up = true;
            game.update(0.016);
            
            expect(playThrustSpy).toHaveBeenCalled();
            expect(stopThrustSpy).not.toHaveBeenCalled();
        });
        
        test('stops thrust sound when thrust is deactivated', () => {
            const playThrustSpy = jest.spyOn(game.audio, 'playThrustSound');
            const stopThrustSpy = jest.spyOn(game.audio, 'stopThrustSound');
            
            // Set initial state
            keys.up = false;
            game.update(0.016);
            
            // Simulate thrust key press
            keys.up = true;
            game.update(0.016);
            
            // Simulate thrust key release
            keys.up = false;
            game.update(0.016);
            
            expect(stopThrustSpy).toHaveBeenCalled();
            expect(playThrustSpy).toHaveBeenCalledTimes(1);
        });
        
        test('does not play thrust sound during game over', () => {
            const playThrustSpy = jest.spyOn(game.audio, 'playThrustSound');
            
            // Set game to game over state
            game.gameOver = true;
            
            // Set initial state
            keys.up = false;
            game.update(0.016);
            
            // Simulate thrust key press
            keys.up = true;
            game.update(0.016);
            
            expect(playThrustSpy).not.toHaveBeenCalled();
        });
    });

    describe('initialization', () => {
        test('initializes with correct canvas dimensions', () => {
            expect(game.canvas.width).toBe(800);
            expect(game.canvas.height).toBe(600);
        });

        test('initializes audio on user interaction', async () => {
            // Create a new game instance to ensure clean audio state
            const testGame = new Game(canvas, true);
            
            // Spy on startBackgroundBeat method
            const startBackgroundBeatSpy = jest.spyOn(testGame.audio, 'startBackgroundBeat');
            
            // Simulate user interaction
            document.dispatchEvent(new KeyboardEvent('keydown'));
            
            // Wait for any promises to resolve
            await Promise.resolve();
            
            // Verify that startBackgroundBeat was called
            expect(startBackgroundBeatSpy).toHaveBeenCalled();
        });
    });

    describe('game state management', () => {
        test('pauses and resumes game correctly', () => {
            const stopBeatSpy = jest.spyOn(game.audio, 'stopBackgroundBeat');
            
            expect(game.paused).toBe(false);
            game.stop();
            expect(game.paused).toBe(true);
            expect(stopBeatSpy).toHaveBeenCalled();
        });

        test('handles screen wrapping correctly', () => {
            // Test ship wrapping
            game.ship.x = -10;
            game.ship.y = -10;
            game.wrapObject(game.ship);
            expect(game.ship.x).toBe(game.canvas.width);
            expect(game.ship.y).toBe(game.canvas.height);

            // Test bullet wrapping
            const bullet = game.ship.shoot();
            if (bullet) {
                bullet.x = game.canvas.width + 10;
                bullet.y = game.canvas.height + 10;
                game.wrapObject(bullet);
                expect(bullet.x).toBe(0);
                expect(bullet.y).toBe(0);
            }
        });

        test('handles resize correctly', () => {
            const originalWidth = game.canvas.width;
            const originalHeight = game.canvas.height;
            
            // Simulate resize
            canvas.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 1024,
                height: 768
            });
            game.resize();
            
            expect(game.canvas.width).toBe(1024);
            expect(game.canvas.height).toBe(768);
            
            // Ship should stay within bounds
            expect(game.ship.x).toBeLessThanOrEqual(game.canvas.width);
            expect(game.ship.y).toBeLessThanOrEqual(game.canvas.height);
        });

        describe('extra life system', () => {
            beforeEach(() => {
                game.score = 0;
                game.lastExtraLifeScore = 0;
                game.lives = GAME_SETTINGS.INITIAL_LIVES;
            });

            test('awards extra life at 10000 points', () => {
                const playExtraLifeSpy = jest.spyOn(game.audio, 'playExtraLifeSound');
                const initialLives = game.lives;

                // Set score just below threshold
                game.score = 9999;
                game.checkExtraLife();
                expect(game.lives).toBe(initialLives);
                expect(playExtraLifeSpy).not.toHaveBeenCalled();

                // Set score at threshold
                game.score = 10000;
                game.checkExtraLife();
                expect(game.lives).toBe(initialLives + 1);
                expect(playExtraLifeSpy).toHaveBeenCalled();
            });

            test('awards multiple extra lives correctly', () => {
                const playExtraLifeSpy = jest.spyOn(game.audio, 'playExtraLifeSound');
                const initialLives = game.lives;

                // Set score for two extra lives
                game.score = 20500;
                game.checkExtraLife();
                expect(game.lives).toBe(initialLives + 2);
                expect(playExtraLifeSpy).toHaveBeenCalledTimes(1);

                // Should not award another life until next threshold
                game.checkExtraLife();
                expect(game.lives).toBe(initialLives + 2);
                expect(playExtraLifeSpy).toHaveBeenCalledTimes(1);
            });

            test('resets extra life counter on game reset', () => {
                game.score = 15000;
                game.checkExtraLife();
                const livesAfterExtra = game.lives;

                game.reset();
                expect(game.lastExtraLifeScore).toBe(0);
                expect(game.lives).toBe(GAME_SETTINGS.INITIAL_LIVES);
                expect(game.lives).toBeLessThan(livesAfterExtra);
            });
        });

        describe('high score system', () => {
            beforeEach(() => {
                game.score = 0;
                game.highScore = GAME_SETTINGS.DEFAULT_HIGH_SCORE;
            });

            test('initializes with default high score', () => {
                const newGame = new Game(canvas, true);
                expect(newGame.highScore).toBe(GAME_SETTINGS.DEFAULT_HIGH_SCORE);
            });

            test('updates high score when score exceeds it', () => {
                // Create a large asteroid and destroy it
                const asteroid = new Asteroid(400, 300, 'large');
                game.score = GAME_SETTINGS.DEFAULT_HIGH_SCORE - 10;
                game.handleAsteroidDestruction(asteroid);
                
                // Score should increase by 20 (large asteroid value)
                expect(game.score).toBe(GAME_SETTINGS.DEFAULT_HIGH_SCORE + 10);
                expect(game.highScore).toBe(GAME_SETTINGS.DEFAULT_HIGH_SCORE + 10);
            });

            test('maintains high score across game resets', () => {
                // Set a high score
                game.score = 10000;
                game.highScore = 10000;
                
                // Reset the game
                game.reset();
                
                // Score should reset but high score should remain
                expect(game.score).toBe(0);
                expect(game.highScore).toBe(10000);
            });

            test('does not update high score when score is lower', () => {
                const originalHighScore = game.highScore;
                game.score = originalHighScore - 1000;
                
                // Destroy an asteroid
                const asteroid = new Asteroid(400, 300, 'small');
                game.handleAsteroidDestruction(asteroid);
                
                // High score should not change
                expect(game.highScore).toBe(originalHighScore);
            });
        });
    });

    describe('game over state transitions', () => {
        beforeEach(() => {
            // Mock game over screen element with classList
            document.body.innerHTML = '<div id="game-over-screen" class=""></div>';
            const gameOverScreen = document.getElementById('game-over-screen');
            const classListState = { visible: false };
            gameOverScreen.classList = {
                add: jest.fn().mockImplementation(className => {
                    if (className === 'visible') classListState.visible = true;
                }),
                remove: jest.fn().mockImplementation(className => {
                    if (className === 'visible') classListState.visible = false;
                }),
                contains: jest.fn().mockImplementation(className => 
                    className === 'visible' ? classListState.visible : false
                )
            };
            
            // Initialize game
            game = new Game(canvas, true);
            game.init();
            
            // Mock asteroids for collision
            game.asteroids = [{
                x: 0,
                y: 0,
                radius: 10,
                size: 'large',
                velocity: { x: 0, y: 0 }
            }];
            game.ship.lives = 1;
            game.ship.isInvulnerable = false;
            
            // Position ship for collision
            game.ship.x = 0;
            game.ship.y = 0;
            game.ship.radius = 10;
            
            // Use fake timers
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('transitions through game over states correctly', () => {
            // Set up game over screen element
            document.body.innerHTML = '<div id="game-over-screen" class=""></div>';
            const game = new Game(canvas, true);
            game.init();
            game.lives = 1;
            game.asteroids = [{
                x: 0,
                y: 0,
                radius: 10,
                size: 'large',
                velocity: { x: 0, y: 0 }
            }];
            game.ship.x = 0;
            game.ship.y = 0;
            game.ship.radius = 10;
            game.ship.isInvulnerable = false;

            // Initial state
            expect(game.gameOver).toBe(false);
            expect(game.gameOverPending).toBe(false);
            expect(document.getElementById('game-over-screen').classList.contains('visible')).toBe(false);

            // Trigger collision
            game.checkCollisions();

            // Check pending state
            expect(game.gameOver).toBe(false);
            expect(game.gameOverPending).toBe(true);
            expect(document.getElementById('game-over-screen').classList.contains('visible')).toBe(false);

            // Advance timer to trigger game over
            jest.advanceTimersByTime(GAME_SETTINGS.GAME_OVER_DELAY);

            // Check final state
            expect(game.gameOver).toBe(true);
            expect(game.gameOverPending).toBe(false);
            expect(document.getElementById('game-over-screen').classList.contains('visible')).toBe(true);

            // Test game restart
            window.dispatchEvent(new KeyboardEvent('keydown'));
            expect(game.gameOver).toBe(false);
            expect(game.gameOverPending).toBe(false);
            expect(document.getElementById('game-over-screen').classList.contains('visible')).toBe(false);
        });

        test('clears game over timer on reset', () => {
            const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
            
            // Set up game over timer
            game.gameOverTimer = setTimeout(() => {}, 1000);
            
            game.reset();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            expect(game.gameOverTimer).toBeNull();
        });
    });

    describe('asteroid velocity behavior', () => {
        test('initial asteroids have non-zero velocity', () => {
            game.createNewWave();
            
            game.asteroids.forEach(asteroid => {
                const speed = Math.hypot(asteroid.velocity.x, asteroid.velocity.y);
                expect(speed).toBeGreaterThan(0);
                // Speed should be between 50 and 100
                expect(speed).toBeGreaterThanOrEqual(50);
                expect(speed).toBeLessThanOrEqual(100);
            });
        });

        test('split asteroids inherit and increase parent velocity', () => {
            // Create a parent asteroid with known velocity
            const parentAsteroid = new Asteroid(400, 300, 'large');
            parentAsteroid.velocity = { x: 60, y: 80 }; // Speed = 100
            game.asteroids = [parentAsteroid];
            
            // Split the asteroid
            game.handleAsteroidDestruction(parentAsteroid);
            
            // Check the child asteroids
            const childAsteroids = game.asteroids;
            expect(childAsteroids.length).toBe(2);
            
            childAsteroids.forEach(child => {
                // Child speed should be 1.5x parent speed
                const parentSpeed = Math.hypot(parentAsteroid.velocity.x, parentAsteroid.velocity.y);
                const childSpeed = Math.hypot(child.velocity.x, child.velocity.y);
                expect(childSpeed).toBeCloseTo(parentSpeed * 1.5, 1);
                
                // Direction should be within 45 degrees of parent
                const parentAngle = Math.atan2(parentAsteroid.velocity.y, parentAsteroid.velocity.x);
                const childAngle = Math.atan2(child.velocity.y, child.velocity.x);
                const angleDiff = Math.abs(childAngle - parentAngle);
                expect(angleDiff).toBeLessThanOrEqual(Math.PI / 4 + 0.01); // Adding small delta for floating point comparison
            });
        });

        test('asteroid velocity persists through multiple splits', () => {
            // Create initial large asteroid with known velocity
            const largeAsteroid = new Asteroid(400, 300, 'large');
            largeAsteroid.velocity = { x: 60, y: 80 }; // Speed = 100
            game.asteroids = [largeAsteroid];
            
            // Split large asteroid
            game.handleAsteroidDestruction(largeAsteroid);
            const mediumAsteroids = [...game.asteroids];
            
            // Split one of the medium asteroids
            game.handleAsteroidDestruction(mediumAsteroids[0]);
            const smallAsteroids = game.asteroids.filter(a => a.size === 'small');
            
            // Check small asteroids have higher speed than original
            const originalSpeed = Math.hypot(largeAsteroid.velocity.x, largeAsteroid.velocity.y);
            smallAsteroids.forEach(asteroid => {
                const speed = Math.hypot(asteroid.velocity.x, asteroid.velocity.y);
                // After two splits, speed should be 1.5 * 1.5 times the original
                expect(speed).toBeCloseTo(originalSpeed * 1.5 * 1.5, 1);
            });
        });
    });
}); 