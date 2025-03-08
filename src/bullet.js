export default class Bullet {
    constructor(x, y, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.velocity = { x: velocityX, y: velocityY };
        this.radius = 2;
        this.lifeTime = 2; // seconds
        this.timer = 0;
        this.isDead = false;
    }
    
    update(deltaTime) {
        // Update position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Update lifetime
        this.timer += deltaTime;
        if (this.timer >= this.lifeTime) {
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