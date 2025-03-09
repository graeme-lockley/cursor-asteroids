import Bullet from './bullet.js';

// Constants
const ROTATION_SPEED = 5; // radians per second
const THRUST_POWER = 200; // pixels per second squared
const FRICTION = 0.99; // velocity multiplier per frame
const MAX_SPEED = 400; // pixels per second
const BULLET_SPEED = 500; // pixels per second
const SHOOT_DELAY = 0.20; // seconds
const INVULNERABILITY_TIME = 2; // seconds

export default class Ship {
    constructor(x, y) {
        // Position and orientation
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.rotation = 0;
        
        // Movement
        this.velocity = { x: 0, y: 0 };
        this.thrust = false;
        this.prevThrust = false;  // Track previous thrust state
        
        // Visual
        this.radius = 15;
        
        // Combat state
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.shootTimer = 0;
    }
    
    update(deltaTime, keys, width, height) {
        this.handleRotation(deltaTime, keys);
        this.handleThrust(deltaTime, keys);
        this.updatePosition(deltaTime, width, height);
        this.updateTimers(deltaTime);
    }
    
    handleRotation(deltaTime, keys) {
        // Set rotation direction based on input
        if (keys.left) this.rotation = -ROTATION_SPEED;
        else if (keys.right) this.rotation = ROTATION_SPEED;
        else this.rotation = 0;
        
        // Update angle
        this.angle += this.rotation * deltaTime;
    }
    
    handleThrust(deltaTime, keys) {
        this.prevThrust = this.thrust;  // Store previous thrust state
        this.thrust = keys.up;
        
        if (this.thrust) {
            // Calculate thrust vector
            const thrustX = Math.cos(this.angle) * THRUST_POWER * deltaTime;
            const thrustY = Math.sin(this.angle) * THRUST_POWER * deltaTime;
            
            // Apply thrust to velocity
            this.velocity.x += thrustX;
            this.velocity.y += thrustY;
        }
        
        // Apply friction and speed limit
        this.applyFriction();
        this.limitSpeed();
    }
    
    applyFriction() {
        this.velocity.x *= FRICTION;
        this.velocity.y *= FRICTION;
    }
    
    limitSpeed() {
        const speed = Math.hypot(this.velocity.x, this.velocity.y);
        if (speed > MAX_SPEED) {
            const scale = MAX_SPEED / speed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }
    
    updatePosition(deltaTime, width, height) {
        // Update position based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Wrap around screen edges
        this.wrapAroundScreen(width, height);
    }
    
    wrapAroundScreen(width, height) {
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
    
    updateTimers(deltaTime) {
        // Update shoot cooldown
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
        }
        
        // Update invulnerability
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += deltaTime;
            if (this.invulnerabilityTimer >= INVULNERABILITY_TIME) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
    
    shoot() {
        if (this.shootTimer <= 0) {
            // Calculate bullet spawn position at ship's nose
            const bulletX = this.x + Math.cos(this.angle) * this.radius;
            const bulletY = this.y + Math.sin(this.angle) * this.radius;
            
            // Calculate bullet velocity
            const bulletVelX = Math.cos(this.angle) * BULLET_SPEED;
            const bulletVelY = Math.sin(this.angle) * BULLET_SPEED;
            
            // Reset shoot timer
            this.shootTimer = SHOOT_DELAY;
            
            // Create new bullet
            return new Bullet(bulletX, bulletY, bulletVelX, bulletVelY);
        }
        return null;
    }
    
    render(ctx) {
        // Don't render if blinking during invulnerability
        if (this.isInvulnerable && Math.floor(this.invulnerabilityTimer * 10) % 2) {
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        this.drawShip(ctx);
        if (this.thrust) {
            this.drawThruster(ctx);
        }
        
        ctx.restore();
    }
    
    drawShip(ctx) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, -this.radius / 2);
        ctx.lineTo(-this.radius, this.radius / 2);
        ctx.closePath();
        ctx.stroke();
    }
    
    drawThruster(ctx) {
        ctx.beginPath();
        ctx.moveTo(-this.radius, 0);
        ctx.lineTo(-this.radius - 10, -5);
        ctx.lineTo(-this.radius - 5, 0);
        ctx.lineTo(-this.radius - 10, 5);
        ctx.closePath();
        ctx.stroke();
    }
    
    reset(x, y) {
        // Reset position and orientation
        this.x = x;
        this.y = y;
        this.angle = 0;
        
        // Reset movement
        this.velocity = { x: 0, y: 0 };
        
        // Reset combat state
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 0;
        this.shootTimer = 0;  // Reset shoot timer when resetting ship
    }
} 