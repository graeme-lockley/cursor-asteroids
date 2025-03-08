import Ship from '../src/ship.js';

describe('Ship', () => {
    let ship;
    const width = 800;
    const height = 600;
    
    beforeEach(() => {
        ship = new Ship(400, 300);
    });
    
    describe('initialization', () => {
        test('initializes with correct position and orientation', () => {
            expect(ship.x).toBe(400);
            expect(ship.y).toBe(300);
            expect(ship.angle).toBe(0);
            expect(ship.rotation).toBe(0);
        });
        
        test('initializes with zero velocity', () => {
            expect(ship.velocity.x).toBe(0);
            expect(ship.velocity.y).toBe(0);
            expect(ship.thrust).toBe(false);
        });
        
        test('initializes with correct combat state', () => {
            expect(ship.isInvulnerable).toBe(false);
            expect(ship.invulnerabilityTimer).toBe(0);
            expect(ship.shootTimer).toBe(0);
        });
    });
    
    describe('movement', () => {
        test('rotates left when left key is pressed', () => {
            const keys = { left: true, right: false, up: false, space: false };
            ship.update(0.1, keys, width, height);
            expect(ship.angle).toBeLessThan(0);
        });
        
        test('rotates right when right key is pressed', () => {
            const keys = { left: false, right: true, up: false, space: false };
            ship.update(0.1, keys, width, height);
            expect(ship.angle).toBeGreaterThan(0);
        });
        
        test('applies thrust when up key is pressed', () => {
            const keys = { left: false, right: false, up: true, space: false };
            ship.angle = Math.PI / 2; // Pointing down
            ship.update(0.1, keys, width, height);
            expect(ship.velocity.y).toBeGreaterThan(0);
        });
        
        test('applies friction to velocity', () => {
            ship.velocity = { x: 100, y: 100 };
            ship.update(0.1, { left: false, right: false, up: false, space: false }, width, height);
            expect(Math.abs(ship.velocity.x)).toBeLessThan(100);
            expect(Math.abs(ship.velocity.y)).toBeLessThan(100);
        });
        
        test('wraps around screen edges', () => {
            // Test horizontal wrapping
            ship.x = -1;
            ship.update(0.1, {}, width, height);
            expect(ship.x).toBe(width);
            
            ship.x = width + 1;
            ship.update(0.1, {}, width, height);
            expect(ship.x).toBe(0);
            
            // Test vertical wrapping
            ship.y = -1;
            ship.update(0.1, {}, width, height);
            expect(ship.y).toBe(height);
            
            ship.y = height + 1;
            ship.update(0.1, {}, width, height);
            expect(ship.y).toBe(0);
        });
    });
    
    describe('combat', () => {
        test('creates bullet when shooting', () => {
            const bullet = ship.shoot();
            expect(bullet).toBeTruthy();
            expect(bullet.x).toBeGreaterThan(ship.x);
            expect(bullet.y).toBe(ship.y);
        });
        
        test('respects shoot cooldown', () => {
            const firstBullet = ship.shoot();
            const secondBullet = ship.shoot();
            expect(firstBullet).toBeTruthy();
            expect(secondBullet).toBeNull();
        });
        
        test('becomes vulnerable after invulnerability time', () => {
            ship.isInvulnerable = true;
            ship.update(2.1, {}, width, height); // Update longer than invulnerability time
            expect(ship.isInvulnerable).toBe(false);
        });
    });
    
    describe('reset', () => {
        test('resets position and state correctly', () => {
            ship.velocity = { x: 100, y: 100 };
            ship.angle = Math.PI;
            ship.isInvulnerable = false;
            
            ship.reset(200, 150);
            
            expect(ship.x).toBe(200);
            expect(ship.y).toBe(150);
            expect(ship.velocity.x).toBe(0);
            expect(ship.velocity.y).toBe(0);
            expect(ship.angle).toBe(0);
            expect(ship.isInvulnerable).toBe(true);
            expect(ship.invulnerabilityTimer).toBe(0);
        });
    });
}); 