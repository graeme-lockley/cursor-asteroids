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
    constructor(x, y, canvas) {
        // Store canvas reference
        this.canvas = canvas;
        
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
        this.visible = true;
        
        // Combat state
        this.isInvulnerable = false;  // Start not invulnerable
        this.invulnerabilityTimer = 0;  // Start with no timer
        this.shootTimer = 0;

        // Disintegration state
        this.isDisintegrating = false;
        this.disintegrationTimer = 0;
        this.disintegrationPieces = [];
        this.respawnTimer = 0;
    }
    
    update(deltaTime, keys, width, height) {
        this.updateDisintegration(deltaTime);
        if (!this.isDisintegrating && this.visible) {
            this.handleRotation(deltaTime, keys);
            this.handleThrust(deltaTime, keys);
            this.updatePosition(deltaTime, width, height);
        }
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
        
        // Update invulnerability - FIXED: now counts down instead of up
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }
    
    shoot() {
        if (this.shootTimer <= 0 && !this.isDisintegrating && this.visible) {
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
        if (this.isDisintegrating && this.visible) {
            // Draw disintegrating pieces
            ctx.save();
            ctx.translate(this.x, this.y);
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            
            // Draw each piece
            this.disintegrationPieces.forEach(piece => {
                ctx.beginPath();
                ctx.moveTo(piece.points[0].x, piece.points[0].y);
                for (let i = 1; i < piece.points.length; i++) {
                    ctx.lineTo(piece.points[i].x, piece.points[i].y);
                }
                ctx.stroke();
            });
            
            ctx.restore();
        } else if (this.visible) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            if (this.isInvulnerable) {
                // Simple flash between visible and invisible
                const flash = Math.sin(Date.now() / 50);  // Keep the fast flash rate
                ctx.strokeStyle = flash > 0 ? 'white' : 'rgba(255, 255, 255, 0)';
            } else {
                ctx.strokeStyle = 'white';
            }
            ctx.lineWidth = 2;
            
            this.drawShip(ctx);
            if (this.thrust) {
                this.drawThruster(ctx);
            }
            
            ctx.restore();
        }
    }
    
    drawShip(ctx) {
        ctx.beginPath();
        
        // Draw the main triangle shape with concave back
        ctx.moveTo(this.radius, 0);  // Front tip
        ctx.lineTo(-this.radius / 2, -this.radius / 2);  // Top back point
        ctx.lineTo(-this.radius * 0.3, 0);  // Back indent
        ctx.lineTo(-this.radius / 2, this.radius / 2);   // Bottom back point
        ctx.closePath();
        ctx.stroke();
    }
    
    drawThruster(ctx) {
        ctx.beginPath();
        
        // Draw a simple V shape for thrust
        ctx.moveTo(-this.radius * 0.3, -this.radius * 0.2);  // Top inner point
        ctx.lineTo(-this.radius * 0.8, 0);                    // Back point
        ctx.lineTo(-this.radius * 0.3, this.radius * 0.2);   // Bottom inner point
        ctx.stroke();
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.velocity = { x: 0, y: 0 };
        this.thrust = false;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = INVULNERABILITY_TIME;
        this.isDisintegrating = false;
        this.disintegrationTimer = 0;
        this.visible = true;
    }

    startDisintegration() {
        this.isDisintegrating = true;
        this.disintegrationTimer = 0;
        this.respawnTimer = 0;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = INVULNERABILITY_TIME;
        
        // Clear thrust state when disintegrating
        this.thrust = false;
        this.prevThrust = false;
        this.velocity = { x: 0, y: 0 };  // Stop all movement
        
        // Create ship pieces for animation
        // Front piece
        this.disintegrationPieces.push({
            points: [
                { x: this.radius, y: 0 },
                { x: -this.radius / 2, y: -this.radius / 2 }
            ],
            velocity: { x: Math.random() * 30 - 15, y: Math.random() * 30 - 15 },
            rotation: (Math.random() - 0.5) * 4
        });

        // Back right piece
        this.disintegrationPieces.push({
            points: [
                { x: -this.radius / 2, y: -this.radius / 2 },
                { x: -this.radius, y: 0 }
            ],
            velocity: { x: Math.random() * 30 - 15, y: Math.random() * 30 - 15 },
            rotation: (Math.random() - 0.5) * 4
        });

        // Back left piece
        this.disintegrationPieces.push({
            points: [
                { x: -this.radius, y: 0 },
                { x: -this.radius / 2, y: this.radius / 2 },
                { x: -this.radius / 2, y: -this.radius / 2 }
            ],
            velocity: { x: Math.random() * 30 - 15, y: Math.random() * 30 - 15 },
            rotation: (Math.random() - 0.5) * 4
        });
    }

    updateDisintegration(deltaTime) {
        if (this.isDisintegrating) {
            this.disintegrationTimer += deltaTime;
            
            // Update piece positions
            this.disintegrationPieces.forEach(piece => {
                // Move pieces
                piece.points.forEach(point => {
                    point.x += piece.velocity.x * deltaTime;
                    point.y += piece.velocity.y * deltaTime;
                });
                
                // Rotate pieces
                const cos = Math.cos(piece.rotation * deltaTime);
                const sin = Math.sin(piece.rotation * deltaTime);
                piece.points.forEach(point => {
                    const x = point.x;
                    const y = point.y;
                    point.x = x * cos - y * sin;
                    point.y = x * sin + y * cos;
                });

                // Slow down pieces
                piece.velocity.x *= 0.98;
                piece.velocity.y *= 0.98;
                piece.rotation *= 0.98;
            });

            // After 2 seconds of disintegration, start respawn timer
            if (this.disintegrationTimer >= 2) {
                this.isDisintegrating = false;
                this.disintegrationPieces = [];
                this.visible = false;
                this.respawnTimer = 2; // Additional 2 second delay before respawn
                // Keep invulnerability during invisible period
                this.isInvulnerable = true;
                this.invulnerabilityTimer = INVULNERABILITY_TIME;
            }
        } else if (this.respawnTimer > 0) {  // Only update respawn timer if it's active
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                // Reset ship at center of screen with fresh invulnerability
                this.reset(this.canvas.width / 2, this.canvas.height / 2);
                // Make sure the ship is visible after reset
                this.visible = true;
                this.isInvulnerable = true;
                this.invulnerabilityTimer = INVULNERABILITY_TIME;
            }
        }
    }
} 