export const SoundManager = {
    ctx: null,
    bgmTimer: null,
    isBgmOn: true,
    noteIndex: 0,
    bgmNotes: [
        261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 196.00,
        261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 196.00,
        261.63, 311.13, 415.30, 523.25, 415.30, 311.13, 261.63, 207.65,
        246.94, 293.66, 392.00, 493.88, 392.00, 293.66, 246.94, 196.00
    ], 

    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if(!this.ctx) this.ctx = new AudioContext();
    },
    playTone: function(freq, type, duration, vol = 0.1) {
        if (!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        
        if (typeof freq === 'object') {
            osc.frequency.setValueAtTime(freq.start, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq.end, this.ctx.currentTime + duration);
        } else {
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    startBGM: function() {
        if (!this.isBgmOn || this.bgmTimer) return;
        
        const tempo = 250; 
        this.bgmTimer = setInterval(() => {
            if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            
            const freq = this.bgmNotes[this.noteIndex % this.bgmNotes.length];
            const detune = (Math.random() - 0.5) * 5; 
            this.playTone(freq + detune, 'sine', 0.5, 0.03);

            if (this.noteIndex % 8 === 0) {
                let bassFreq = 65.41; 
                const bar = Math.floor((this.noteIndex % 32) / 8);
                if (bar === 2) bassFreq = 51.91;
                if (bar === 3) bassFreq = 49.00;
                
                this.playTone(bassFreq, 'triangle', 2.0, 0.1); 
                 this.playTone(bassFreq * 2, 'triangle', 2.0, 0.05); 
            }
            
            this.noteIndex++;
        }, tempo);
    },
    stopBGM: function() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    },
    toggleBGM: function() {
        this.isBgmOn = !this.isBgmOn;
        if(this.isBgmOn) this.startBGM();
        else this.stopBGM();
        return this.isBgmOn;
    },
    move: function() { this.playTone(300, 'square', 0.1, 0.05); },
    rotate: function() { this.playTone(400, 'sine', 0.15, 0.05); },
    drop: function() { this.playTone(150, 'sawtooth', 0.2, 0.1); }, 
    
    clear: function() { 
        this.playTone({start: 400, end: 50}, 'sawtooth', 0.6, 0.3);
        this.playTone({start: 300, end: 30}, 'square', 0.6, 0.2);
    },
    
    gameOver: function() {
        this.stopBGM(); 
        this.playTone(200, 'sawtooth', 0.5, 0.2);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.5, 0.2), 300);
    }
};
