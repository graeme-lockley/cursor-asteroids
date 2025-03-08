import Bullet, { BULLET_MAX_DISTANCE } from '../src/bullet.js';

describe('Bullet', () => {
    let bullet;
    const width = 800;
    const height = 600;
    const minScreenDimension = Math.min(width, height);
    
    beforeEach(() => {
        bullet = new Bullet(400, 300, 100, 0); // Moving right at 100 pixels/second
    });
    
    test('initializes with correct properties', () => {
        expect(bullet.x).toBe(400);
        expect(bullet.y).toBe(300);
        expect(bullet.velocity.x).toBe(100);
        expect(bullet.velocity.y).toBe(0);
        expect(bullet.distanceTraveled).toBe(0);
        expect(bullet.isDead).toBe(false);
    });
    
    test('wraps around screen horizontally and tracks distance', () => {
        // Move bullet to right edge
        bullet.x = width - 10;
        bullet.update(0.2, width, height); // Move for 0.2 seconds
        
        // Should wrap to left side and accumulate distance
        expect(bullet.x).toBeLessThan(width);
        expect(bullet.distanceTraveled).toBeGreaterThan(0);
        
        const firstDistance = bullet.distanceTraveled;
        
        // Move bullet to left edge
        bullet.x = 10;
        bullet.velocity.x = -100; // Change direction
        bullet.update(0.2, width, height);
        
        // Should wrap to right side and accumulate more distance
        expect(bullet.x).toBeGreaterThan(0);
        expect(bullet.distanceTraveled).toBeGreaterThan(firstDistance);
    });
    
    test('wraps around screen vertically and tracks distance', () => {
        bullet.velocity = { x: 0, y: 100 }; // Moving down
        
        // Move bullet to bottom edge
        bullet.y = height - 10;
        bullet.update(0.2, width, height);
        
        // Should wrap to top and accumulate distance
        expect(bullet.y).toBeLessThan(height);
        expect(bullet.distanceTraveled).toBeGreaterThan(0);
        
        const firstDistance = bullet.distanceTraveled;
        
        // Move bullet to top edge
        bullet.y = 10;
        bullet.velocity.y = -100; // Change direction
        bullet.update(0.2, width, height);
        
        // Should wrap to bottom and accumulate more distance
        expect(bullet.y).toBeGreaterThan(0);
        expect(bullet.distanceTraveled).toBeGreaterThan(firstDistance);
    });
    
    test('expires after traveling maximum distance', () => {
        const speed = 1000; // pixels per second
        bullet = new Bullet(0, 0, speed, 0);
        
        // Update until just before max distance
        const timeToMaxDistance = (minScreenDimension * BULLET_MAX_DISTANCE * 0.9) / speed;
        bullet.update(timeToMaxDistance, width, height);
        expect(bullet.isDead).toBe(false);
        
        // Update to exceed max distance
        bullet.update(timeToMaxDistance * 0.2, width, height);
        expect(bullet.isDead).toBe(true);
    });
    
    test('expires at same relative distance in any direction', () => {
        // Test horizontal movement
        const horizontalBullet = new Bullet(0, 0, 100, 0);
        let horizontalDistance = 0;
        while (!horizontalBullet.isDead) {
            horizontalBullet.update(0.1, width, height);
            horizontalDistance = horizontalBullet.distanceTraveled;
        }
        
        // Test diagonal movement (same speed)
        const diagonalSpeed = 100;
        const angle = Math.PI / 4; // 45 degrees
        const diagonalBullet = new Bullet(
            0, 0,
            diagonalSpeed * Math.cos(angle),
            diagonalSpeed * Math.sin(angle)
        );
        let diagonalDistance = 0;
        while (!diagonalBullet.isDead) {
            diagonalBullet.update(0.1, width, height);
            diagonalDistance = diagonalBullet.distanceTraveled;
        }
        
        // Both bullets should travel approximately the same distance
        // Allow for small numerical differences due to discrete time steps
        expect(Math.abs(horizontalDistance - diagonalDistance)).toBeLessThan(15);
    });
    
    test('expires before completing a full screen wrap', () => {
        // Test vertical movement
        const verticalBullet = new Bullet(400, 300, 0, 100); // Moving down
        while (!verticalBullet.isDead) {
            verticalBullet.update(0.1, width, height);
        }
        expect(verticalBullet.distanceTraveled).toBeLessThanOrEqual(height * BULLET_MAX_DISTANCE);
        
        // Test horizontal movement
        const horizontalBullet = new Bullet(400, 300, 100, 0); // Moving right
        while (!horizontalBullet.isDead) {
            horizontalBullet.update(0.1, width, height);
        }
        expect(horizontalBullet.distanceTraveled).toBeLessThanOrEqual(width * BULLET_MAX_DISTANCE);
    });
    
    test('moves at constant velocity', () => {
        const initialX = bullet.x;
        const deltaTime = 0.1;
        
        bullet.update(deltaTime, width, height);
        
        const expectedX = initialX + bullet.velocity.x * deltaTime;
        expect(bullet.x).toBeCloseTo(expectedX);
    });
}); 