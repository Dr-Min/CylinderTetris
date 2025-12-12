import * as THREE from 'three';
import { CONFIG, CALCULATED } from './constants.js';

// 메모리 누수 방지를 위한 리소스 관리자
// Geometry와 Material을 재사용하여 매 프레임 생성을 방지합니다.
class ResourceManager {
    constructor() {
        this.materials = new Map();
        this.geometries = new Map();
        this.initCommonResources();
    }

    initCommonResources() {
        // 블록 Geometry 생성 (하나만 생성해서 계속 재사용)
        const circumference = 2 * Math.PI * CONFIG.RADIUS; 
        const cellArcLength = circumference / CONFIG.GRID_WIDTH; 
        const blockWidth = cellArcLength * 0.92; 
        const blockHeight = CALCULATED.CELL_HEIGHT * 0.92; 
        
        this.blockGeometry = new THREE.BoxGeometry(blockWidth, blockHeight, 0.5);
    }

    getMaterial(color, isGhost = false) {
        const key = `${color}-${isGhost}`;
        if (!this.materials.has(key)) {
            const material = new THREE.MeshStandardMaterial({ 
                color: color,
                emissive: color,
                emissiveIntensity: isGhost ? 0.3 : 0.8,
                transparent: true,
                opacity: isGhost ? 0.3 : 1.0, 
                roughness: 0.2,
                metalness: 0.1 
            });
            this.materials.set(key, material);
        }
        return this.materials.get(key);
    }

    getBlockGeometry() {
        return this.blockGeometry;
    }
    
    // 필요 시 호출하여 자원 해제
    dispose() {
        this.blockGeometry.dispose();
        this.materials.forEach(mat => mat.dispose());
        this.materials.clear();
    }
}

export const resourceManager = new ResourceManager();
