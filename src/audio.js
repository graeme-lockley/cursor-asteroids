export default class AudioManager {
    constructor() {
        // Create audio context
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Audio buffers for each sound
        this.buffers = {};
        
        // Audio pools
        this.pools = {
            beat1: [],
            beat2: [],
            fire: [],
            bangLarge: [],
            bangMedium: [],
            bangSmall: []
        };
        
        // Pool configuration
        this.poolConfig = {
            beat1: { url: 'sounds/beat1.wav', size: 2 },
            beat2: { url: 'sounds/beat2.wav', size: 2 },
            fire: { url: 'sounds/fire.wav', size: 4 },
            bangLarge: { url: 'sounds/bang-large.wav', size: 4 },
            bangMedium: { url: 'sounds/bang-medium.wav', size: 4 },
            bangSmall: { url: 'sounds/bang-small.wav', size: 4 }
        };
        
        this.beatInterval = 1000;  // Initial beat interval in ms
        this.beatTimer = null;
        this.currentBeat = 0;  // 0 for beat1, 1 for beat2
        
        // Initialize audio
        this.init();
    }
    
    async init() {
        try {
            // Load all sound buffers
            await Promise.all(
                Object.entries(this.poolConfig).map(async ([key, config]) => {
                    const response = await fetch(config.url);
                    const arrayBuffer = await response.arrayBuffer();
                    this.buffers[key] = await this.context.decodeAudioData(arrayBuffer);
                    
                    // Create pool for this sound
                    this.createPool(key, config.size);
                })
            );
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }
    
    createPool(key, size) {
        for (let i = 0; i < size; i++) {
            const source = this.context.createBufferSource();
            source.buffer = this.buffers[key];
            
            const gainNode = this.context.createGain();
            gainNode.gain.value = 0.5;  // 50% volume
            
            source.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            this.pools[key].push({
                source,
                gainNode,
                isPlaying: false,
                startTime: 0
            });
        }
    }
    
    getAvailableNode(pool) {
        const now = this.context.currentTime;
        
        // First try to find a node that's not playing
        let node = pool.find(n => !n.isPlaying);
        
        // If all nodes are playing, find the oldest one
        if (!node) {
            node = pool.reduce((oldest, current) => {
                return (!oldest || current.startTime < oldest.startTime) ? current : oldest;
            }, null);
            
            // Disconnect and recreate the source node
            node.source.disconnect();
            node.source = this.context.createBufferSource();
            node.source.buffer = node.source.buffer;
            node.source.connect(node.gainNode);
        }
        
        return node;
    }
    
    playSound(poolKey) {
        const pool = this.pools[poolKey];
        if (!pool) return;
        
        const node = this.getAvailableNode(pool);
        if (!node) return;
        
        // Create new source (sources can only be played once)
        node.source = this.context.createBufferSource();
        node.source.buffer = this.buffers[poolKey];
        node.source.connect(node.gainNode);
        
        node.isPlaying = true;
        node.startTime = this.context.currentTime;
        
        node.source.onended = () => {
            node.isPlaying = false;
        };
        
        node.source.start(0);
    }
    
    playFireSound() {
        this.playSound('fire');
    }
    
    playBangSound(size) {
        switch (size) {
            case 'large':
                this.playSound('bangLarge');
                break;
            case 'medium':
                this.playSound('bangMedium');
                break;
            case 'small':
                this.playSound('bangSmall');
                break;
        }
    }
    
    startBackgroundBeat(wave) {
        // Stop any existing beat
        this.stopBackgroundBeat();
        
        // Calculate new interval based on wave number
        // Each wave speeds up the beat, up to 4x faster
        const speedMultiplier = Math.min(4, 1 + (wave - 1) * 0.5);
        this.beatInterval = 1000 / speedMultiplier;
        
        // Start the beat
        const playBeat = () => {
            this.playSound(this.currentBeat === 0 ? 'beat1' : 'beat2');
            
            // Switch to other beat for next time
            this.currentBeat = 1 - this.currentBeat;
            
            // Schedule next beat
            this.beatTimer = setTimeout(playBeat, this.beatInterval);
        };
        
        // Start with beat1
        this.currentBeat = 0;
        playBeat();
    }
    
    stopBackgroundBeat() {
        if (this.beatTimer) {
            clearTimeout(this.beatTimer);
            this.beatTimer = null;
        }
    }
} 