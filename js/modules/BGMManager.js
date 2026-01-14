/**
 * BGMManager - Procedural BGM System with Multiple Tracks
 * 트랙별로 다른 분위기의 음악을 실시간 생성
 */
export class BGMManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.compressor = null;
    
    this.isPlaying = false;
    this.isMuted = false;
    this.currentTrack = null;
    
    // 볼륨 (0~1, localStorage에서 불러옴)
    this.volume = this.loadSavedVolume();
    
    // 스케줄러
    this.schedulerTimer = null;
    this.currentBeat = 0;
    this.nextNoteTime = 0;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 25;
    
    // 현재 BPM (트랙별로 다름)
    this.bpm = 100;
    this.targetBpm = 100;
    
    // 트랙 인덱스 (패턴 순환용)
    this.bassNoteIndex = 0;
    this.leadNoteIndex = 0;
    
    // === 트랙 정의 ===
    this.tracks = {
      // ========================================
      // SAFE ZONE - 편안하고 느긋한 분위기
      // ========================================
      SAFE_ZONE: {
        name: "Safe Zone",
        baseBpm: 90,
        maxBpm: 110,
        masterVolume: 0.25,
        
        // 드럼 패턴 (느린 4/4)
        kickPattern:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        hihatPattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        snarePattern: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 스네어 없음
        
        // 베이스 (부드러운 사인파)
        bassPattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        bassNotes: [55, 55, 65.4, 73.4, 55, 55, 65.4, 82.4], // A1, C2, D2, E2
        bassType: 'sine',
        bassDecay: 0.4,
        
        // 리드 (부드러운 패드)
        leadPattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        leadNotes: [220, 261.6, 293.7, 329.6], // A3, C4, D4, E4
        leadType: 'sine',
        leadVolume: 0.06,
        
        // 아르페지오 (잔잔한)
        arpChance: 0.08,
        arpNotes: [110, 130.8, 146.8, 164.8], // A2, C3, D3, E3
        
        // 드럼 사운드 설정
        kickFreq: 120,
        kickDecay: 0.2,
        hihatVolume: 0.08,
        snareVolume: 0,
      },
      
      // ========================================
      // DEFENSE - 긴박하고 긴장감 있는 전투
      // ========================================
      DEFENSE: {
        name: "Defense",
        baseBpm: 128,
        maxBpm: 165,
        masterVolume: 0.3,
        
        // 드럼 패턴 (하드한 4/4, 더블 킥)
        kickPattern:  [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
        hihatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 16비트 하이햇
        snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        
        // 베이스 (공격적인 톱니파)
        bassPattern: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1],
        bassNotes: [55, 55, 41.2, 55, 61.7, 55, 41.2, 73.4], // A1, E1, A1, B1, E1, D2
        bassType: 'sawtooth',
        bassDecay: 0.15,
        
        // 리드 (날카로운 스퀘어)
        leadPattern: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
        leadNotes: [220, 293.7, 329.6, 392, 440, 523.2], // A3, D4, E4, G4, A4, C5
        leadType: 'square',
        leadVolume: 0.1,
        
        // 아르페지오 (빠른)
        arpChance: 0.2,
        arpNotes: [110, 146.8, 174.6, 220, 293.7], // A2, D3, F3, A3, D4
        
        // 드럼 사운드 설정 (하드)
        kickFreq: 160,
        kickDecay: 0.12,
        hihatVolume: 0.12,
        snareVolume: 0.3,
      },
      
      // ========================================
      // FINAL - 최종 페이지/보스전 최고 긴장감
      // ========================================
      FINAL: {
        name: "Final",
        baseBpm: 150,
        maxBpm: 185,
        masterVolume: 0.35,
        
        // 드럼 패턴 (격렬한 브레이크비트)
        kickPattern:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
        hihatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        snarePattern: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
        
        // 베이스 (디스토션 느낌, 낮은 옥타브)
        bassPattern: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
        bassNotes: [41.2, 41.2, 36.7, 41.2, 49, 41.2, 55, 61.7], // E1, D1, E1, G1, A1, B1
        bassType: 'sawtooth',
        bassDecay: 0.08,
        
        // 리드 (공격적인, 디튠 강화)
        leadPattern: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0],
        leadNotes: [329.6, 392, 440, 523.2, 587.3, 659.2], // E4, G4, A4, C5, D5, E5
        leadType: 'sawtooth',
        leadVolume: 0.12,
        
        // 아르페지오 (격렬)
        arpChance: 0.35,
        arpNotes: [146.8, 174.6, 220, 293.7, 349.2, 440],
        
        // 드럼 사운드 설정 (격렬)
        kickFreq: 180,
        kickDecay: 0.1,
        hihatVolume: 0.15,
        snareVolume: 0.4,
        
        // 추가 효과
        addDistortion: true,
      },
    };
  }

  /**
   * 오디오 컨텍스트 초기화
   */
  init() {
    if (this.audioCtx) return;
    
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // 마스터 볼륨
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioCtx.destination);
      
      // 컴프레서
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 25;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.2;
      this.compressor.connect(this.masterGain);
      
      debugLog("GameManager", "Manager Initialized");
    } catch (e) {
      debugLog("GameManager", `Audio not supported: ${e}`);
    }
  }

  /**
   * 트랙 재생 시작
   * @param {string} trackName - 트랙 이름 (SAFE_ZONE, DEFENSE, FINAL)
   */
  play(trackName = 'DEFENSE') {
    if (this.isMuted) return;
    
    const track = this.tracks[trackName];
    if (!track) {
      debugLog("GameManager", `Unknown track: ${trackName}`);
      return;
    }
    
    // 이미 같은 트랙 재생 중이면 스킵
    if (this.isPlaying && this.currentTrack === trackName) return;
    
    // 다른 트랙 재생 중이면 부드럽게 전환
    if (this.isPlaying && this.currentTrack !== trackName) {
      this.crossfadeTo(trackName);
      return;
    }
    
    this.init();
    if (!this.audioCtx) return;
    
    // AudioContext resume
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    this.currentTrack = trackName;
    this.bpm = track.baseBpm;
    this.targetBpm = track.baseBpm;
    this.masterGain.gain.value = track.masterVolume * this.volume;
    
    this.isPlaying = true;
    this.currentBeat = 0;
    this.bassNoteIndex = 0;
    this.leadNoteIndex = 0;
    this.nextNoteTime = this.audioCtx.currentTime;
    
    // 스케줄러 시작
    this.schedulerTimer = setInterval(() => this.scheduler(), this.lookahead);
    
    debugLog("GameManager", `Playing: ${track.name} at ${this.bpm} BPM`);
  }

  /**
   * 재생 정지
   */
  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.currentTrack = null;
    
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    debugLog("GameManager", "Stopped");
  }

  /**
   * 뮤트 토글
   * @returns {boolean} - 뮤트 해제 상태면 true
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stop();
    }
    
    return !this.isMuted;
  }

  /**
   * 볼륨 설정 (0~1)
   * @param {number} volume - 볼륨 값 (0~1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      // 트랙의 기본 볼륨에 사용자 볼륨 곱하기
      const trackVolume = this.currentTrack ? this.tracks[this.currentTrack].masterVolume : 0.3;
      this.masterGain.gain.value = trackVolume * this.volume;
    }
    // localStorage에 저장
    localStorage.setItem('bgmVolume', this.volume.toString());
  }

  /**
   * 현재 볼륨 가져오기
   * @returns {number} - 현재 볼륨 (0~1)
   */
  getVolume() {
    return this.volume ?? 1;
  }

  /**
   * 저장된 볼륨 불러오기
   */
  loadSavedVolume() {
    const saved = localStorage.getItem('bgmVolume');
    this.volume = saved !== null ? parseFloat(saved) : 1;
    return this.volume;
  }

  /**
   * 트랙 전환 (크로스페이드)
   */
  crossfadeTo(trackName) {
    const track = this.tracks[trackName];
    if (!track) return;
    
    // 현재 볼륨 페이드아웃 후 새 트랙으로 전환
    const fadeDuration = 0.5;
    const now = this.audioCtx.currentTime;
    
    this.masterGain.gain.linearRampToValueAtTime(0.01, now + fadeDuration);
    
    setTimeout(() => {
      this.currentTrack = trackName;
      this.bpm = track.baseBpm;
      this.targetBpm = track.baseBpm;
      this.currentBeat = 0;
      this.bassNoteIndex = 0;
      this.leadNoteIndex = 0;
      
      this.masterGain.gain.linearRampToValueAtTime(
        track.masterVolume * this.volume, 
        this.audioCtx.currentTime + fadeDuration
      );
      
      debugLog("GameManager", `Switched to: ${track.name}`);
    }, fadeDuration * 1000);
  }

  /**
   * BPM 업데이트 (페이지 기반)
   * @param {number} page - 현재 페이지
   * @param {number} maxPage - 최대 페이지
   */
  updateTempo(page, maxPage = 12) {
    if (!this.currentTrack) return;
    
    const track = this.tracks[this.currentTrack];
    const progress = Math.min((page - 1) / (maxPage - 1), 1);
    this.targetBpm = track.baseBpm + (track.maxBpm - track.baseBpm) * progress;
    
    // 부드럽게 BPM 변경
    const diff = this.targetBpm - this.bpm;
    this.bpm += diff * 0.2;
  }

  /**
   * 스케줄러 - 비트 단위 사운드 스케줄링
   */
  scheduler() {
    if (!this.isPlaying || !this.audioCtx || !this.currentTrack) return;
    
    const secondsPerBeat = 60.0 / this.bpm / 4;
    
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeat, this.nextNoteTime);
      this.nextNoteTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % 16;
    }
  }

  /**
   * 비트에 맞춰 사운드 스케줄링
   */
  scheduleBeat(beat, time) {
    const track = this.tracks[this.currentTrack];
    if (!track) return;
    
    // 킥 드럼
    if (track.kickPattern[beat]) {
      this.playKick(time, track);
    }
    
    // 하이햇
    if (track.hihatPattern[beat]) {
      this.playHihat(time, track);
    }
    
    // 스네어
    if (track.snarePattern[beat] && track.snareVolume > 0) {
      this.playSnare(time, track);
    }
    
    // 베이스
    if (track.bassPattern[beat]) {
      const noteIndex = this.bassNoteIndex % track.bassNotes.length;
      this.playBass(time, track.bassNotes[noteIndex], track);
      this.bassNoteIndex++;
    }
    
    // 리드
    if (track.leadPattern[beat]) {
      const noteIndex = this.leadNoteIndex % track.leadNotes.length;
      this.playLead(time, track.leadNotes[noteIndex], track);
      this.leadNoteIndex++;
    }
    
    // 아르페지오
    if (Math.random() < track.arpChance) {
      const note = track.arpNotes[beat % track.arpNotes.length];
      this.playArp(time, note, track);
    }
  }

  // === 사운드 생성 메서드들 ===

  playKick(time, track) {
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(track.kickFreq, time);
    osc.frequency.exponentialRampToValueAtTime(25, time + track.kickDecay);
    
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + track.kickDecay + 0.05);
    
    osc.connect(gain);
    gain.connect(this.compressor);
    
    osc.start(time);
    osc.stop(time + track.kickDecay + 0.1);
  }

  playHihat(time, track) {
    const ctx = this.audioCtx;
    
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(track.hihatVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    noise.start(time);
  }

  playSnare(time, track) {
    const ctx = this.audioCtx;
    
    // 노이즈
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3500;
    filter.Q.value = 1;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(track.snareVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    noise.start(time);
    
    // 톤
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.05);
    oscGain.gain.setValueAtTime(track.snareVolume * 0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(oscGain);
    oscGain.connect(this.compressor);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  playBass(time, freq, track) {
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = track.bassType;
    osc.frequency.setValueAtTime(freq, time);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + track.bassDecay);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + track.bassDecay + 0.1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    osc.start(time);
    osc.stop(time + track.bassDecay + 0.15);
  }

  playLead(time, freq, track) {
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = track.leadType;
    osc.frequency.setValueAtTime(freq, time);
    
    // 디튠
    osc2.type = track.leadType;
    osc2.frequency.setValueAtTime(freq * 1.008, time);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.25);
    
    gain.gain.setValueAtTime(track.leadVolume, time);
    gain.gain.setValueAtTime(track.leadVolume, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    osc.start(time);
    osc.stop(time + 0.3);
    osc2.start(time);
    osc2.stop(time + 0.3);
  }

  playArp(time, freq, track) {
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    osc.connect(gain);
    gain.connect(this.compressor);
    
    osc.start(time);
    osc.stop(time + 0.1);
  }
}
