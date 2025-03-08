import Ship from '../src/ship.js';

describe('Ship', () => {
    let ship;
    
    beforeEach(() => {
        ship = new Ship(400, 300);
    });
    
    test('initializes with correct properties', () => {
        expect(ship.x).toBe(400);
        expect(ship.y).toBe(300);
        expect(ship.angle).toBe(0);
        expect(ship.velocity.x).toBe(0);
        expect(ship.velocity.y).toBe(0);
    });
    
    test('rotates correctly', () => {
        // Test left rotation
        const leftKeys = { left: true, right: false, up: false, space: false };
        ship.update(0.1, leftKeys, 800, 600);
        expect(ship.angle).toBeLessThan(0);
        
        // Reset ship
        ship.angle = 0;
        
        // Test right rotation
        const rightKeys = { left: false, right: true, up: false, space: false };
        ship.update(0.1, rightKeys, 800, 600);
        expect(ship.angle).toBeGreaterThan(0);
    });
    
    test('applies thrust correctly', () => {
        const keys = { left: false, right: false, up: true, space: false };
        ship.angle = Math.PI / 2; // Pointing down
        ship.update(0.1, keys, 800, 600);
        expect(ship.velocity.y).toBeGreaterThan(0);
    });
    
    test('respects speed limit', () => {
        const keys = { left: false, right: false, up: true, space: false };
        ship.angle = 0; // Pointing right
        
        // Apply thrust for several frames
        for (let i = 0; i < 20; i++) {
            ship.update(0.1, keys, 800, 600);
        }
        
        const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
        expect(speed).toBeLessThanOrEqual(ship.maxSpeed);
    });
}); 