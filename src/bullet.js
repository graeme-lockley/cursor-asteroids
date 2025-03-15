// Constants
export const BULLET_MAX_DISTANCE = 0.95; // As a fraction of screen dimension

import { wrapPosition } from './collision.js';

export default class Bullet {
    constructor(x, y, velocityX, velocityY) {
        // Position
        this.x = x;
        this.y = y;
        
        // Movement
        this.velocity = { x: velocityX, y: velocityY };
        
        // Visual
        this.radius = 2;
        
        // State
        this.distanceTraveled = 0;
        this.isDead = false;
    }
    
    update(deltaTime, width, height) {
        this.updatePosition(deltaTime);
        this.handleScreenWrapping(width, height);
        this.checkExpiration(width, height);
    }
    
    updatePosition(deltaTime) {
        // Store previous position for distance calculation
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update position based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
    }
    
    handleScreenWrapping(width, height) {
        // Use the central wrapping utility with distance tracking
        wrapPosition(this, width, height, {
            trackDistance: true,
            addDistanceCallback: (dx, dy) => this.addDistanceTraveled(dx, dy)
        });
    }
    
    addDistanceTraveled(dx, dy) {
        // Use Pythagorean theorem to calculate actual distance moved
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    }
    
    checkExpiration(width, height) {
        const minScreenDimension = Math.min(width, height);
        const maxDistance = minScreenDimension * BULLET_MAX_DISTANCE;
        
        if (this.distanceTraveled >= maxDistance) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
} 