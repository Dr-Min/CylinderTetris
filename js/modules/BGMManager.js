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

    // 음악성: 4마디 코드 진행 + 진행도 기반 인텐시티
    this.currentBar = 0;
    this.intensity = 0;
    
    // === 트랙 정의 (v2.3.1 — 전곡 신규 작곡) ===
    this.tracks = {
      // ========================================
      // SAFE ZONE "Harbor" — 로파이, 느긋한 항구의 밤
      // ========================================
      SAFE_ZONE: {
        name: "Harbor",
        baseBpm: 76,
        maxBpm: 88,
        masterVolume: 0.22,
        swing: 0.28,

        kickPattern:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        hihatPattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
        snarePattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],

        // A 마이너 펜타토닉 — 따뜻한 트라이앵글 베이스
        bassPattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        bassNotes: [55, 49, 43.65, 41.2, 55, 65.4],
        bassType: 'triangle',
        bassDecay: 0.55,

        // 드문드문 떨어지는 부드러운 멜로디
        leadPattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        leadNotes: [220, 246.9, 261.6, 329.6, 293.7, 261.6, 246.9, 220],
        leadType: 'sine',
        leadVolume: 0.07,

        arpChance: 0.06,
        arpNotes: [110, 130.8, 164.8, 196],

        kickFreq: 95,
        kickDecay: 0.28,
        hihatVolume: 0.05,
        snareVolume: 0.06,
        chordProgression: [0, -4, 3, -2], // Am - F - C - G 무드
      },

      // ========================================
      // DEFENSE "Pursuit" — 신스웨이브 추격전
      // ========================================
      DEFENSE: {
        name: "Pursuit",
        baseBpm: 132,
        maxBpm: 158,
        masterVolume: 0.28,
        swing: 0,

        kickPattern:  [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0],
        hihatPattern: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
        snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],

        // 오프비트 8분 음표 베이스 — 달리는 느낌
        bassPattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        bassNotes: [41.2, 41.2, 41.2, 49, 41.2, 41.2, 55, 49],
        bassType: 'sawtooth',
        bassDecay: 0.12,

        // E 마이너 후크 리프
        leadPattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
        leadNotes: [164.8, 196, 246.9, 196, 329.6, 246.9, 196, 164.8],
        leadType: 'square',
        leadVolume: 0.09,

        arpChance: 0.16,
        arpNotes: [82.4, 98, 123.5, 164.8, 196],

        kickFreq: 150,
        kickDecay: 0.12,
        hihatVolume: 0.1,
        snareVolume: 0.28,
        chordProgression: [0, 0, -4, -2], // Em - Em - C - D 무드
      },

      // ========================================
      // FINAL "Zero Hour" — 프리지안 광폭
      // ========================================
      FINAL: {
        name: "Zero Hour",
        baseBpm: 158,
        maxBpm: 186,
        masterVolume: 0.33,
        swing: 0,

        kickPattern:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
        hihatPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1],

        // 프리지안(♭2) 리프 — 불길한 반음 충돌
        bassPattern: [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
        bassNotes: [41.2, 43.7, 41.2, 36.7, 41.2, 43.7, 49, 41.2],
        bassType: 'sawtooth',
        bassDecay: 0.08,

        leadPattern: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
        leadNotes: [329.6, 349.2, 392, 329.6, 493.9, 440, 392, 349.2],
        leadType: 'sawtooth',
        leadVolume: 0.11,

        arpChance: 0.3,
        arpNotes: [164.8, 174.6, 220, 246.9, 329.6],

        kickFreq: 180,
        kickDecay: 0.1,
        hihatVolume: 0.13,
        snareVolume: 0.4,
        addDistortion: true,
        chordProgression: [0, 1, 0, -5], // E - F - E - B 프리지안
      },

      // ========================================
      // BOSS "The Oldest System" — 둠 하프타임
      // ========================================
      BOSS: {
        name: "The Oldest System",
        baseBpm: 92,
        maxBpm: 122,
        masterVolume: 0.36,
        swing: 0,

        kickPattern:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        hihatPattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        snarePattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],

        // 트라이톤이 박힌 무거운 서브 베이스
        bassPattern: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        bassNotes: [41.2, 41.2, 58.27, 41.2, 38.9, 41.2],
        bassType: 'sawtooth',
        bassDecay: 0.32,

        // 드물게 떨어지는 불길한 종소리
        leadPattern: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        leadNotes: [246.9, 233.1, 246.9, 311.1],
        leadType: 'triangle',
        leadVolume: 0.1,

        arpChance: 0.07,
        arpNotes: [82.4, 87.3, 116.5],

        kickFreq: 130,
        kickDecay: 0.3,
        hihatVolume: 0.07,
        snareVolume: 0.5,
        chordProgression: [0, 6, 0, -1], // 트라이톤 상승 후 반음 하강
      },

      // ========================================
      // CONQUERED "Afterglow" — 점령지의 여운
      // ========================================
      CONQUERED: {
        name: "Afterglow",
        baseBpm: 84,
        maxBpm: 96,
        masterVolume: 0.22,
        swing: 0.2,

        kickPattern:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        hihatPattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        snarePattern: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],

        // C 메이저 — 밝고 안정적인 쿼터 베이스
        bassPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        bassNotes: [65.4, 98, 87.3, 73.4],
        bassType: 'triangle',
        bassDecay: 0.5,

        leadPattern: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        leadNotes: [261.6, 329.6, 392, 523.25, 392, 329.6],
        leadType: 'sine',
        leadVolume: 0.08,

        arpChance: 0.1,
        arpNotes: [130.8, 164.8, 196, 261.6],

        kickFreq: 100,
        kickDecay: 0.25,
        hihatVolume: 0.06,
        snareVolume: 0.1,
        chordProgression: [0, -3, -7, -5], // C - Am - F - G 무드
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
    this.intensity = progress;
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
      const track = this.tracks[this.currentTrack];
      const swing = track && track.swing && this.currentBeat % 2 === 1
        ? secondsPerBeat * track.swing
        : 0;
      this.scheduleBeat(this.currentBeat, this.nextNoteTime + swing);
      this.nextNoteTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % 16;
      if (this.currentBeat === 0) {
        this.currentBar = (this.currentBar + 1) % 4; // 4마디 코드 순환
      }
    }
  }

  /**
   * 비트에 맞춰 사운드 스케줄링
   */
  scheduleBeat(beat, time) {
    const track = this.tracks[this.currentTrack];
    if (!track) return;

    // 4마디 코드 진행: 반음 단위 트랜스포즈
    const semis = track.chordProgression
      ? track.chordProgression[this.currentBar % track.chordProgression.length]
      : 0;
    const transpose = Math.pow(2, semis / 12);

    // 킥 드럼
    if (track.kickPattern[beat]) {
      this.playKick(time, track);
    }

    // 하이햇
    if (track.hihatPattern[beat]) {
      this.playHihat(time, track);
    }

    // 스네어 (4번째 마디 끝은 필인: 후반 4비트 연타)
    const isFillZone = this.currentBar === 3 && beat >= 12;
    if ((track.snarePattern[beat] || isFillZone) && track.snareVolume > 0) {
      this.playSnare(time, track);
    }

    // 베이스
    if (track.bassPattern[beat]) {
      const noteIndex = this.bassNoteIndex % track.bassNotes.length;
      this.playBass(time, track.bassNotes[noteIndex] * transpose, track);
      this.bassNoteIndex++;
    }

    // 리드 (인텐시티에 따라 약간 커짐)
    if (track.leadPattern[beat]) {
      const noteIndex = this.leadNoteIndex % track.leadNotes.length;
      this.playLead(time, track.leadNotes[noteIndex] * transpose, {
        ...track,
        leadVolume: track.leadVolume * (0.85 + this.intensity * 0.4),
      });
      this.leadNoteIndex++;
    }

    // 아르페지오 (진행도가 깊어질수록 잦아짐)
    const arpChance = track.arpChance * (0.7 + this.intensity * 0.9);
    if (Math.random() < arpChance) {
      const note = track.arpNotes[beat % track.arpNotes.length];
      this.playArp(time, note * transpose, track);
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
