export default class AudioManager {
    constructor(isTest = false) {
        // Create audio context if not in test mode
        if (!isTest) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Audio buffers for each sound
        this.buffers = {};
        
        // Audio pools
        this.pools = {
            beat1: [],
            beat2: [],
            fire: [],
            bangLarge: [],
            bangMedium: [],
            bangSmall: [],
            waveEnd: []
        };
        
        // Pool configuration
        this.poolConfig = {
            beat1: { url: 'sounds/beat1.wav', size: 2 },
            beat2: { url: 'sounds/beat2.wav', size: 2 },
            fire: { url: 'sounds/fire.wav', size: 4 },
            bangLarge: { url: 'sounds/bang-large.wav', size: 4 },
            bangMedium: { url: 'sounds/bang-medium.wav', size: 4 },
            bangSmall: { url: 'sounds/bang-small.wav', size: 4 },
            waveEnd: { url: 'sounds/wave-end.wav', size: 2 }
        };
        
        this.baseInterval = 1000;  // Base interval in ms (slowest)
        this.minInterval = 250;    // Minimum interval in ms (fastest)
        this.beatInterval = this.baseInterval;
        this.beatTimer = null;
        this.currentBeat = 0;
        
        // Initialize audio
        if (!isTest) {
            this.init();
        } else {
            // Create mock pools for testing
            Object.keys(this.poolConfig).forEach(key => {
                const config = this.poolConfig[key];
                for (let i = 0; i < config.size; i++) {
                    this.pools[key].push({
                        source: {
                            connect: jest.fn(),
                            disconnect: jest.fn(),
                            start: jest.fn(),
                            stop: jest.fn(),
                            buffer: null
                        },
                        gainNode: {
                            connect: jest.fn(),
                            gain: { value: 0.5 }
                        },
                        isPlaying: false,
                        startTime: 0
                    });
                }
            });
        }
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
        if (!pool || pool.length === 0) return null;
        
        const now = this.context ? this.context.currentTime : Date.now() / 1000;
        
        // First try to find a node that's not playing
        let node = pool.find(n => !n.isPlaying);
        
        // If all nodes are playing, find the oldest one
        if (!node) {
            node = pool.reduce((oldest, current) => {
                return (!oldest || current.startTime < oldest.startTime) ? current : oldest;
            }, null);
            
            if (this.context) {
                // Disconnect and recreate the source node
                node.source.disconnect();
                node.source = this.context.createBufferSource();
                node.source.buffer = node.source.buffer;
                node.source.connect(node.gainNode);
            }
        }
        
        return node;
    }
    
    playSound(poolKey) {
        const pool = this.pools[poolKey];
        if (!pool) return;
        
        const node = this.getAvailableNode(pool);
        if (!node) return;
        
        if (this.context) {
            // Create new source (sources can only be played once)
            node.source = this.context.createBufferSource();
            node.source.buffer = this.buffers[poolKey];
            node.source.connect(node.gainNode);
        }
        
        node.isPlaying = true;
        node.startTime = this.context ? this.context.currentTime : Date.now() / 1000;
        
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
    
    playWaveEndSound() {
        // Stop the regular background beat
        this.stopBackgroundBeat();
        
        // Use current interval for the finale
        const finaleInterval = this.beatInterval / 2;  // Twice as fast as current beat
        
        // Play quick double beat finale
        this.playSound('beat1');
        setTimeout(() => {
            this.playSound('beat2');
        }, finaleInterval);
    }
    
    startBackgroundBeat(wave, delay = 0) {
        // Stop any existing beat
        this.stopBackgroundBeat();
        
        // Reset to base interval at start of wave
        this.beatInterval = this.baseInterval;
        
        if (delay === 0) {
            this.startBeatSequence();
        } else {
            setTimeout(() => this.startBeatSequence(), delay);
        }
    }
    
    startBeatSequence() {
        // Start with beat1
        this.currentBeat = 0;
        
        const playBeat = () => {
            this.playSound(this.currentBeat === 0 ? 'beat1' : 'beat2');
            
            // Switch to other beat for next time
            this.currentBeat = 1 - this.currentBeat;
            
            // Schedule next beat
            this.beatTimer = setTimeout(playBeat, this.beatInterval);
        };
        
        // Play first beat
        playBeat();
    }
    
    stopBackgroundBeat() {
        if (this.beatTimer) {
            clearTimeout(this.beatTimer);
            this.beatTimer = null;
        }
    }

    updateBeatInterval(remainingAsteroids, totalAsteroids) {
        // Calculate how far through the wave we are (0 to 1)
        const progress = 1 - (remainingAsteroids / totalAsteroids);
        
        // Calculate new interval, interpolating between base and min intervals
        this.beatInterval = this.baseInterval - (progress * (this.baseInterval - this.minInterval));
        
        // If we're currently playing beats, restart with new interval
        if (this.beatTimer) {
            this.stopBackgroundBeat();
            this.startBeatSequence();
        }
    }
} 