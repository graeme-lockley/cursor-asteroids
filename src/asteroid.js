export default class Asteroid {
    constructor(x, y, size, baseSpeed = null, angle = null, baseVelocity = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        
        // Set radius based on size
        const radii = {
            large: 40,
            medium: 20,
            small: 10
        };
        this.radius = radii[size];
        
        // Set velocity based on parameters or random if not provided
        if (baseVelocity) {
            // Use the base velocity as a starting point
            const speedMultiplier = 1.5;  // Increase speed for smaller asteroids
            const angleVariance = Math.PI / 4;  // 45 degree variance
            const newAngle = angle || Math.random() * Math.PI * 2;
            
            // Calculate new velocity components
            const speed = Math.hypot(baseVelocity.x, baseVelocity.y) * speedMultiplier;
            const currentAngle = Math.atan2(baseVelocity.y, baseVelocity.x);
            const finalAngle = currentAngle + (Math.random() * 2 - 1) * angleVariance;
            
            this.velocity = {
                x: Math.cos(finalAngle) * speed,
                y: Math.sin(finalAngle) * speed
            };
        } else {
            // Random velocity for new asteroids
            const speed = baseSpeed || (Math.random() * 50 + 50);
            const randomAngle = angle || Math.random() * Math.PI * 2;
            this.velocity = {
                x: Math.cos(randomAngle) * speed,
                y: Math.sin(randomAngle) * speed
            };
        }
        
        // Create vertices for irregular shape
        this.vertices = this.createVertices();
    }
    
    createVertices() {
        const vertices = [];
        const numVertices = 8;
        const variance = 0.3; // How much the radius can vary
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radiusVariance = 1 + (Math.random() * 2 - 1) * variance;
            vertices.push({
                x: Math.cos(angle) * this.radius * radiusVariance,
                y: Math.sin(angle) * this.radius * radiusVariance
            });
        }
        
        return vertices;
    }
    
    update(deltaTime, width, height) {
        // Update position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Wrap around screen
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw asteroid
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
} 