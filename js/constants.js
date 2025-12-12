// 게임 설정 및 상수
export const CONFIG = {
    GRID_WIDTH: 12, 
    GRID_HEIGHT: 20,
    RADIUS: 5.6,
    DROP_SPEED: 800,
    SWIPE_SENSITIVITY: 30,
    SHOW_GHOST: true, 
    TRANSPARENT_MODE: true,
    COLORS: {
        I: 0x00ffff,
        O: 0xffff00,
        T: 0xff00ff,
        S: 0x00ff00,
        Z: 0xff0000,
        J: 0x0000ff,
        L: 0xffa500,
        GHOST: 0x333333,
        GRID: 0x222222
    }
};

// 계산된 상수
export const CALCULATED = {
    ARC_LENGTH: (2 * Math.PI * CONFIG.RADIUS) / CONFIG.GRID_WIDTH,
    get CELL_HEIGHT() { return this.ARC_LENGTH; },
    get TOTAL_HEIGHT() { return CONFIG.GRID_HEIGHT * this.CELL_HEIGHT; }
};

export const TETROMINOS = {
    I: { shape: [[1,1,1,1]], color: CONFIG.COLORS.I },
    O: { shape: [[1,1],[1,1]], color: CONFIG.COLORS.O },
    T: { shape: [[0,1,0],[1,1,1]], color: CONFIG.COLORS.T },
    S: { shape: [[0,1,1],[1,1,0]], color: CONFIG.COLORS.S },
    Z: { shape: [[1,1,0],[0,1,1]], color: CONFIG.COLORS.Z },
    J: { shape: [[1,0,0],[1,1,1]], color: CONFIG.COLORS.J },
    L: { shape: [[0,0,1],[1,1,1]], color: CONFIG.COLORS.L }
};
