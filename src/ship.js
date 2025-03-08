import Bullet from './bullet.js';

export default class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.angle = 0;
        this.rotation = 0;
        this.velocity = { x: 0, y: 0 };
        this.thrust = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 2; // seconds
        this.invulnerabilityTimer = 0;
        
        // Ship properties
        this.rotationSpeed = 5; // radians per second
        this.thrustPower = 200; // pixels per second squared
        this.friction = 0.99; // velocity multiplier per frame
        this.maxSpeed = 400; // pixels per second
        
        // Shooting properties
        this.canShoot = true;
        this.shootDelay = 0.25; // seconds
        this.shootTimer = 0;
    }
    
    update(deltaTime, keys, width, height) {
        // Handle rotation
        if (keys.left) this.rotation = -this.rotationSpeed;
        else if (keys.right) this.rotation = this.rotationSpeed;
        else this.rotation = 0;
        
        this.angle += this.rotation * deltaTime;
        
        // Handle thrust
        this.thrust = keys.up;
        if (this.thrust) {
            const thrustX = Math.cos(this.angle) * this.thrustPower * deltaTime;
            const thrustY = Math.sin(this.angle) * this.thrustPower * deltaTime;
            this.velocity.x += thrustX;
            this.velocity.y += thrustY;
        }
        
        // Apply friction and speed limit
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        const speed = Math.hypot(this.velocity.x, this.velocity.y);
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
        
        // Update position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        
        // Handle shooting
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
        }
        
        // Update invulnerability
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += deltaTime;
            if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
    
    shoot() {
        if (this.shootTimer <= 0) {
            const bulletSpeed = 500;
            const bulletX = this.x + Math.cos(this.angle) * this.radius;
            const bulletY = this.y + Math.sin(this.angle) * this.radius;
            this.shootTimer = this.shootDelay;
            return new Bullet(
                bulletX,
                bulletY,
                Math.cos(this.angle) * bulletSpeed,
                Math.sin(this.angle) * bulletSpeed
            );
        }
        return null;
    }
    
    render(ctx) {
        // Don't render if invulnerable and should be blinking
        if (this.isInvulnerable && Math.floor(this.invulnerabilityTimer * 10) % 2) {
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw ship
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, -this.radius / 2);
        ctx.lineTo(-this.radius, this.radius / 2);
        ctx.closePath();
        ctx.stroke();
        
        // Draw thrust
        if (this.thrust) {
            ctx.beginPath();
            ctx.moveTo(-this.radius, 0);
            ctx.lineTo(-this.radius - 10, -5);
            ctx.lineTo(-this.radius - 5, 0);
            ctx.lineTo(-this.radius - 10, 5);
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0 };
        this.angle = 0;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 0;
    }
} 