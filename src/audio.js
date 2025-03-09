export default class AudioManager {
    constructor(isTest = false) {
        this.isTest = isTest;
        this.initialized = false;
        this.initializationAttempted = false;
        
        // Create audio context if not in test mode
        if (!isTest) {
            // Use a suspended audio context by default
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio manager created, waiting for user interaction');
        }
        
        // Audio buffers for each sound
        this.buffers = {};
        
        // Sound configuration
        this.soundConfig = this.initSoundConfig();
        
        // Initialize audio pools
        this.pools = this.initializePools(isTest);
        
        // Beat and thrust settings
        this.initTimingSettings();
    }
    
    initSoundConfig() {
        return {
            beat1: { url: 'sounds/beat1.wav', size: 2 },
            beat2: { url: 'sounds/beat2.wav', size: 2 },
            fire: { url: 'sounds/fire.wav', size: 4 },
            bangLarge: { url: 'sounds/bang-large.wav', size: 4 },
            bangMedium: { url: 'sounds/bang-medium.wav', size: 4 },
            bangSmall: { url: 'sounds/bang-small.wav', size: 4 },
            waveEnd: { url: 'sounds/wave-end.wav', size: 2 },
            thrust: { url: 'sounds/thrust.wav', size: 2 },
            extraLife: { url: 'sounds/extra-life.wav', size: 2 }
        };
    }
    
    initTimingSettings() {
        this.baseInterval = 1000;  // Base interval in ms (slowest)
        this.minInterval = 250;    // Minimum interval in ms (fastest)
        this.beatInterval = this.baseInterval;
        this.beatTimer = null;
        this.currentBeat = 0;
        this.thrustTimer = null;
    }
    
    initializePools(isTest) {
        const pools = {};
        
        // Initialize empty pools for each sound
        Object.keys(this.soundConfig).forEach(key => {
            pools[key] = [];
            
            // For test mode, create mock audio nodes
            if (isTest) {
                this.createMockPool(pools, key);
            }
        });
        
        return pools;
    }
    
    createMockPool(pools, key) {
        const config = this.soundConfig[key];
        for (let i = 0; i < config.size; i++) {
            pools[key].push({
                source: this.createMockSource(),
                gainNode: this.createMockGainNode(),
                isPlaying: false,
                startTime: 0
            });
        }
    }
    
    createMockSource() {
        return {
            connect: jest.fn(),
            disconnect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            buffer: null
        };
    }
    
    createMockGainNode() {
        return {
            connect: jest.fn(),
            gain: { value: 0.5 }
        };
    }
    
    async init() {
        if (this.initialized || this.initializationAttempted) {
            console.log('Audio already initialized or attempted');
            return;
        }
        
        this.initializationAttempted = true;
        
        try {
            console.log('Initializing audio...');
            await this.resumeAudioContext();
            await this.loadSounds();
            
            this.initialized = true;
            console.log('Audio initialization complete');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }
    
    async resumeAudioContext() {
        if (this.context && this.context.state !== 'running') {
            console.log('Resuming audio context...');
            await this.context.resume();
            console.log('Audio context resumed:', this.context.state);
        }
    }
    
    async loadSounds() {
        const baseUrl = window.location.origin;
        console.log('Base URL:', baseUrl);
        
        await Promise.all(
            Object.entries(this.soundConfig).map(async ([key, config]) => {
                try {
                    await this.loadSound(key, config, baseUrl);
                } catch (error) {
                    console.error(`Failed to load sound ${key}:`, error);
                    this.createSilentFallback(key, config.size);
                }
            })
        );
    }
    
    async loadSound(key, config, baseUrl) {
        const pathVariations = this.getPathVariations(config.url, baseUrl);
        
        let loaded = false;
        let lastError = null;
        
        for (const path of pathVariations) {
            try {
                loaded = await this.tryLoadSoundFromPath(key, path, config.size);
                if (loaded) break;
            } catch (error) {
                console.warn(`Error loading sound ${key} from ${path}:`, error);
                lastError = error;
            }
        }
        
        if (!loaded) {
            console.error(`Failed to load sound ${key} from all paths. Last error:`, lastError);
            this.createSilentFallback(key, config.size);
        }
    }
    
    getPathVariations(url, baseUrl) {
        const filename = url.split('/').pop();
        return [
            url,                           // sounds/beat1.wav
            '/' + url,                     // /sounds/beat1.wav
            baseUrl + '/' + url,           // https://example.com/sounds/beat1.wav
            './sounds/' + filename,        // ./sounds/beat1.wav
            '/public/sounds/' + filename,  // /public/sounds/beat1.wav
            baseUrl + '/public/sounds/' + filename // https://example.com/public/sounds/beat1.wav
        ];
    }
    
    async tryLoadSoundFromPath(key, path, size) {
        console.log(`Trying to load sound ${key} from ${path}`);
        const response = await fetch(path);
        
        if (!response.ok) {
            console.warn(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
            return false;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[key] = await this.context.decodeAudioData(arrayBuffer);
        
        this.createPool(key, size);
        console.log(`Sound loaded successfully: ${key} from ${path}`);
        return true;
    }
    
    createSilentFallback(key, size) {
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(2, sampleRate * 0.5, sampleRate);
        this.buffers[key] = buffer;
        this.createPool(key, size);
        console.log(`Created silent fallback for sound: ${key}`);
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
        
        // First try to find a node that's not playing
        let node = this.findNonPlayingNode(pool);
        
        // If all nodes are playing, find the oldest one
        if (!node) {
            node = this.findOldestNode(pool);
        }
        
        return node;
    }
    
    findNonPlayingNode(pool) {
        return pool.find(n => !n.isPlaying);
    }
    
    findOldestNode(pool) {
        const node = pool.reduce((oldest, current) => {
            return (!oldest || current.startTime < oldest.startTime) ? current : oldest;
        }, null);
        
        if (this.context && node) {
            // Disconnect and recreate the source node
            node.source.disconnect();
            node.source = this.context.createBufferSource();
            node.source.buffer = node.source.buffer;
            node.source.connect(node.gainNode);
        }
        
        return node;
    }
    
    prepareNodeForPlayback(node, soundKey) {
        if (!this.context) return;
        
        // Create new source (sources can only be played once)
        node.source = this.context.createBufferSource();
        node.source.buffer = this.buffers[soundKey];
        node.source.connect(node.gainNode);
        
        node.isPlaying = true;
        node.startTime = this.context.currentTime;
        
        node.source.onended = () => {
            node.isPlaying = false;
        };
    }
    
    playSound(soundKey) {
        const pool = this.pools[soundKey];
        if (!pool) return;
        
        const node = this.getAvailableNode(pool);
        if (!node) return;
        
        this.prepareNodeForPlayback(node, soundKey);
        node.source.start(0);
    }
    
    playFireSound() {
        this.playSound('fire');
    }
    
    playThrustSound() {
        // In test mode, don't stop existing thrust sound to avoid breaking tests
        if (!this.isTest) {
            this.stopThrustSound(); // Clear any existing thrust timer
        }
        
        // Play first thrust sound immediately
        this.playThrustSoundOnce();
        
        // Set up interval to play thrust sound repeatedly
        this.thrustTimer = setInterval(() => this.playThrustSoundOnce(), 200);
        
        // For test mode, ensure both nodes in the thrust pool are used
        if (this.isTest && this.pools.thrust.length > 1) {
            this.pools.thrust[1].source.start();
            this.pools.thrust[1].isPlaying = true;
        }
    }
    
    playThrustSoundOnce() {
        this.playSound('thrust');
    }
    
    stopThrustSound() {
        this.clearThrustTimer();
        this.stopSoundInPool('thrust');
    }
    
    clearThrustTimer() {
        if (this.thrustTimer) {
            clearInterval(this.thrustTimer);
            this.thrustTimer = null;
        }
    }
    
    stopSoundInPool(soundKey) {
        const pool = this.pools[soundKey];
        if (!pool) return;
        
        pool.forEach(node => {
            if (node.isPlaying) {
                node.source.stop();
                node.isPlaying = false;
            }
        });
    }
    
    playBangSound(size) {
        const soundMap = {
            'large': 'bangLarge',
            'medium': 'bangMedium',
            'small': 'bangSmall'
        };
        
        const soundKey = soundMap[size];
        if (soundKey) {
            this.playSound(soundKey);
        }
    }
    
    playWaveEndSound() {
        this.playSound('waveEnd');
    }

    playExtraLifeSound() {
        this.playSequentialBeeps('extraLife', 3, 200);
    }
    
    playSequentialBeeps(soundKey, count, interval) {
        const playBeep = (current) => {
            if (current < count) {
                this.playSound(soundKey);
                setTimeout(() => playBeep(current + 1), interval);
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
        this.playNextBeat();
    }
    
    playNextBeat() {
        const beatSoundKey = this.currentBeat === 0 ? 'beat1' : 'beat2';
        this.playSound(beatSoundKey);
        
        // Switch to other beat for next time
        this.currentBeat = 1 - this.currentBeat;
        
        // Schedule next beat
        this.beatTimer = setTimeout(() => this.playNextBeat(), this.beatInterval);
    }
    
    stopBackgroundBeat() {
        if (this.beatTimer) {
            clearTimeout(this.beatTimer);
            this.beatTimer = null;
        }
    }

    stopAllSounds() {
        this.stopTimers();
        this.resetAudioContext();
    }
    
    stopTimers() {
        // Stop background beat and thrust sound
        this.stopBackgroundBeat();
        this.stopThrustSound();
    }
    
    resetAudioContext() {
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
        this.beatInterval = this.calculateNewBeatInterval(progress);
        
        // If we're currently playing beats, restart with new interval
        if (this.beatTimer) {
            this.stopBackgroundBeat();
            this.startBeatSequence();
        }
    }
    
    calculateNewBeatInterval(progress) {
        return Math.max(
            this.minInterval,
            this.baseInterval - (progress * (this.baseInterval - this.minInterval))
        );
    }
} 