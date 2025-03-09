export default class AudioManager {
    constructor(isTest = false) {
        // Create audio context if not in test mode
        if (!isTest) {
            // Use a suspended audio context by default
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = false;
            this.initializationAttempted = false;
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
            waveEnd: [],
            thrust: [],
            extraLife: []  // Add extra life sound pool
        };
        
        // Pool configuration with both absolute and relative paths
        this.poolConfig = {
            beat1: { url: 'sounds/beat1.wav', size: 2 },
            beat2: { url: 'sounds/beat2.wav', size: 2 },
            fire: { url: 'sounds/fire.wav', size: 4 },
            bangLarge: { url: 'sounds/bang-large.wav', size: 4 },
            bangMedium: { url: 'sounds/bang-medium.wav', size: 4 },
            bangSmall: { url: 'sounds/bang-small.wav', size: 4 },
            waveEnd: { url: 'sounds/wave-end.wav', size: 2 },
            thrust: { url: 'sounds/thrust.wav', size: 2 },
            extraLife: { url: 'sounds/extra-life.wav', size: 2 }  // Add extra life sound config
        };
        
        this.baseInterval = 1000;  // Base interval in ms (slowest)
        this.minInterval = 250;    // Minimum interval in ms (fastest)
        this.beatInterval = this.baseInterval;
        this.beatTimer = null;
        this.currentBeat = 0;
        this.thrustTimer = null;  // Add timer for thrust sound loop
        
        // Initialize audio
        if (!isTest) {
            // Don't auto-initialize, wait for user interaction
            console.log('Audio manager created, waiting for user interaction');
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
        if (this.initialized || this.initializationAttempted) {
            console.log('Audio already initialized or attempted');
            return;
        }
        
        this.initializationAttempted = true;
        
        try {
            console.log('Initializing audio...');
            
            // Ensure audio context is resumed
            if (this.context.state !== 'running') {
                console.log('Resuming audio context...');
                await this.context.resume();
                console.log('Audio context resumed:', this.context.state);
            }
            
            // Load all sound buffers
            await Promise.all(
                Object.entries(this.poolConfig).map(async ([key, config]) => {
                    try {
                        console.log(`Loading sound: ${key} from ${config.url}`);
                        const response = await fetch(config.url);
                        
                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${config.url}: ${response.status} ${response.statusText}`);
                        }
                        
                        const arrayBuffer = await response.arrayBuffer();
                        this.buffers[key] = await this.context.decodeAudioData(arrayBuffer);
                        
                        // Create pool for this sound
                        this.createPool(key, config.size);
                        console.log(`Sound loaded: ${key}`);
                    } catch (error) {
                        console.error(`Failed to load sound ${key}:`, error);
                        // Try with a fallback path
                        try {
                            const fallbackUrl = '/' + config.url;
                            console.log(`Trying fallback URL: ${fallbackUrl}`);
                            const response = await fetch(fallbackUrl);
                            
                            if (!response.ok) {
                                throw new Error(`Failed to fetch fallback ${fallbackUrl}: ${response.status} ${response.statusText}`);
                            }
                            
                            const arrayBuffer = await response.arrayBuffer();
                            this.buffers[key] = await this.context.decodeAudioData(arrayBuffer);
                            
                            // Create pool for this sound
                            this.createPool(key, config.size);
                            console.log(`Sound loaded from fallback: ${key}`);
                        } catch (fallbackError) {
                            console.error(`Failed to load sound ${key} from fallback:`, fallbackError);
                        }
                    }
                })
            );
            
            this.initialized = true;
            console.log('Audio initialization complete');
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
    
    playThrustSound() {
        // Clear any existing thrust timer
        if (this.thrustTimer) {
            clearInterval(this.thrustTimer);
        }

        const playThrustLoop = () => {
            const pool = this.pools.thrust;
            if (!pool) return;
            
            const node = this.getAvailableNode(pool);
            if (!node) return;
            
            if (this.context) {
                // Create new source (sources can only be played once)
                node.source = this.context.createBufferSource();
                node.source.buffer = this.buffers.thrust;
                node.source.connect(node.gainNode);
            }
            
            node.isPlaying = true;
            node.startTime = this.context ? this.context.currentTime : Date.now() / 1000;
            
            node.source.onended = () => {
                node.isPlaying = false;
            };
            
            node.source.start(0);
        };

        // Play first thrust sound immediately
        playThrustLoop();

        // Set up interval to play thrust sound repeatedly
        // The interval should be slightly shorter than the sound duration to ensure smooth looping
        this.thrustTimer = setInterval(playThrustLoop, 200);  // Adjust this value based on your thrust.wav duration
    }
    
    stopThrustSound() {
        // Clear the thrust timer
        if (this.thrustTimer) {
            clearInterval(this.thrustTimer);
            this.thrustTimer = null;
        }

        const pool = this.pools.thrust;
        if (!pool) return;
        
        pool.forEach(node => {
            if (node.isPlaying) {
                node.source.stop();
                node.isPlaying = false;
            }
        });
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
        this.playSound('waveEnd');
    }

    playExtraLifeSound() {
        // Play the extra life sound three times in sequence
        const playBeep = (count) => {
            if (count < 3) {
                this.playSound('extraLife');
                setTimeout(() => playBeep(count + 1), 200); // 200ms between beeps
            }
        };
        playBeep(0);
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

    stopAllSounds() {
        // Stop background beat and thrust sound
        this.stopBackgroundBeat();
        this.stopThrustSound();
        
        // Stop all currently playing sounds
        if (this.context) {
            // Create new audio context to immediately stop all sounds
            this.context.close();
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Reinitialize audio pools
            this.init();
        }
    }

    updateBeatInterval(remainingAsteroids, totalAsteroids) {
        // Calculate how far through the wave we are (0 to 1)
        const progress = 1 - (remainingAsteroids / totalAsteroids);
        
        // Calculate new interval, interpolating between base and min intervals
        this.beatInterval = Math.max(
            this.minInterval,
            this.baseInterval - (progress * (this.baseInterval - this.minInterval))
        );
        
        // If we're currently playing beats, restart with new interval
        if (this.beatTimer) {
            this.stopBackgroundBeat();
            this.startBeatSequence();
        }
    }
} 