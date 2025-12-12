import * as THREE from 'three';
import { CONFIG, CALCULATED } from './constants.js';
import { resourceManager } from './resources.js';

export class GameRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.worldGroup = null;
        this.piecesGroup = null;
        this.ghostGroup = null;
        this.effectGroup = null;
        this.activeGroup = null;
        this.particleSystem = null;
        this.occluderCylinder = null;
        
        this.nextCtx = null;
        
        this.explosions = [];
        this.cameraShake = 0;
        
        this.init();
    }

    init() {
        const container = document.getElementById("game-container");
        
        // 2D 캔버스 초기화
        const canvas = document.getElementById("next-canvas");
        if (canvas) {
            this.nextCtx = canvas.getContext("2d");
        }
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050510, 0.002);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, CALCULATED.TOTAL_HEIGHT / 2, CONFIG.RADIUS + 100); 
        this.camera.lookAt(0, CALCULATED.TOTAL_HEIGHT / 2, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        this.effectGroup = new THREE.Group();
        this.scene.add(this.effectGroup);

        this.piecesGroup = new THREE.Group();
        this.worldGroup.add(this.piecesGroup);

        this.ghostGroup = new THREE.Group();
        this.worldGroup.add(this.ghostGroup);
        
        // 활성 조각 시각화 그룹
        this.activeGroup = new THREE.Group();
        this.activeGroup.name = "active_piece_visuals";
        this.worldGroup.add(this.activeGroup);

        this.addLights();
        this.createStarfield();
        this.createCylinderGrid();
        this.createOccluder();

        window.addEventListener("resize", () => this.onWindowResize(), false);
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 3.0);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
        frontLight.position.set(0, 50, 100);
        this.scene.add(frontLight);

        const pointLight = new THREE.PointLight(0xff00ff, 0.5, 50);
        pointLight.position.set(0, 0, CONFIG.RADIUS + 5);
        this.scene.add(pointLight);
    }

    createStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 2000;
        const posArray = new Float32Array(starCount * 3);
        
        for(let i=0; i<starCount*3; i++) {
            posArray[i] = (Math.random() - 0.5) * 400; 
        }
        
        starGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true
        });
        this.particleSystem = new THREE.Points(starGeo, starMat);
        this.scene.add(this.particleSystem);
    }

    createCylinderGrid() {
        const material = new THREE.LineBasicMaterial({ color: 0x333333, opacity: 0.3, transparent: true });
        
        // Vertical lines
        for (let i = 0; i < CONFIG.GRID_WIDTH; i++) {
            const angle = (i / CONFIG.GRID_WIDTH) * Math.PI * 2;
            const x = Math.sin(angle) * (CONFIG.RADIUS - 0.1);
            const z = Math.cos(angle) * (CONFIG.RADIUS - 0.1);
            
            const points = [];
            points.push(new THREE.Vector3(x, 0, z));
            points.push(new THREE.Vector3(x, CALCULATED.TOTAL_HEIGHT, z));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.worldGroup.add(line);
        }

        // Horizontal rings
        for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
            const curve = new THREE.EllipseCurve(
                0, 0,
                CONFIG.RADIUS - 0.1, CONFIG.RADIUS - 0.1,
                0,  2 * Math.PI,
                false,
                0
            );
            
            const points = curve.getPoints(CONFIG.GRID_WIDTH * 2);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            geometry.rotateX(Math.PI / 2);
            geometry.translate(0, y * CALCULATED.CELL_HEIGHT, 0);
            
            const ring = new THREE.Line(geometry, material);
            this.worldGroup.add(ring);
        }
    }

    createOccluder() {
        if (this.occluderCylinder) this.worldGroup.remove(this.occluderCylinder);
        const r = CONFIG.RADIUS - 0.1; 
        const geometry = new THREE.CylinderGeometry(r, r, CALCULATED.TOTAL_HEIGHT, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x050510 });
        this.occluderCylinder = new THREE.Mesh(geometry, material);
        this.occluderCylinder.position.y = CALCULATED.TOTAL_HEIGHT / 2;
        this.occluderCylinder.visible = !CONFIG.TRANSPARENT_MODE;
        this.occluderCylinder.renderOrder = -1; 
        this.worldGroup.add(this.occluderCylinder);
    }

    toggleTransparency() {
        if(this.occluderCylinder) {
            this.occluderCylinder.visible = !CONFIG.TRANSPARENT_MODE;
        }
    }

    createExplosion(gridY) {
        const yPos = gridY * CALCULATED.CELL_HEIGHT;
        const particleCount = 60; 
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        
        for(let i=0; i<particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = CONFIG.RADIUS;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;
            const y = yPos + (Math.random() - 0.5) * CALCULATED.CELL_HEIGHT;
            
            positions.push(x, y, z);
            
            const speed = 0.2 + Math.random() * 0.3;
            velocities.push(Math.sin(angle) * speed, (Math.random()-0.5) * 0.5, Math.cos(angle) * speed);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff, 
            size: 0.8,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.userData = { velocities: velocities, life: 1.0 };
        this.effectGroup.add(particles);
        this.explosions.push(particles);
        
        this.cameraShake = 0.8;
    }

    getCylinderPosition(gridX, gridY) {
        const angle = (gridX / CONFIG.GRID_WIDTH) * Math.PI * 2;
        const r = CONFIG.RADIUS;
        
        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r;
        const y = gridY * CALCULATED.CELL_HEIGHT;

        return { x, y, z, rotationY: angle };
    }

    addBlockToGroup(gx, gy, color, group, isGhost = false) {
        const pos = this.getCylinderPosition(gx, gy);
        
        // ResourceManager 사용
        const geometry = resourceManager.getBlockGeometry();
        const material = resourceManager.getMaterial(color, isGhost);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.y = pos.rotationY;
        mesh.lookAt(new THREE.Vector3(pos.x * 2, pos.y, pos.z * 2));

        group.add(mesh);
    }

    renderActivePiece(state, checkCollisionFunc, getWrapXFunc) {
        this.activeGroup.clear(); // 기존 메쉬 제거 (자원은 유지됨)

        if (!state.currentPiece) return;

        // Ghost
        if (CONFIG.SHOW_GHOST) {
            let ghostY = state.currentPiece.y;
            while (!checkCollisionFunc(state.currentPiece.x, ghostY - 1, state.currentPiece.shape)) {
                ghostY--;
            }
            
            const p = state.currentPiece;
            
            for (let r = 0; r < p.shape.length; r++) {
                for (let c = 0; c < p.shape[r].length; c++) {
                    if (p.shape[r][c]) {
                        const gx = getWrapXFunc(p.x + c);
                        const gy = ghostY - r;
                        this.addBlockToGroup(gx, gy, p.color, this.activeGroup, true);
                    }
                }
            }
        }

        // Active Piece
        const p = state.currentPiece;
        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c]) {
                    const gx = getWrapXFunc(p.x + c);
                    const gy = p.y - r;
                    this.addBlockToGroup(gx, gy, p.color, this.activeGroup, false);
                }
            }
        }
    }

    refreshGridVisuals(state) {
        this.piecesGroup.clear();
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                if (state.grid[y][x]) {
                    this.addBlockToGroup(x, y, state.grid[y][x], this.piecesGroup);
                }
            }
        }
    }

    drawNextPiece(state) {
        if (!this.nextCtx || !state.nextPiece) return;
        
        const ctx = this.nextCtx;
        const shape = state.nextPiece.shape;
        const color = state.nextPiece.color;
        const blockSize = 12; 
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        const offsetX = (ctx.canvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (ctx.canvas.height - shape.length * blockSize) / 2;
        
        ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
        
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    ctx.fillRect(offsetX + c * blockSize, offsetY + r * blockSize, blockSize - 1, blockSize - 1);
                }
            }
        }
    }

    updateCamera(state) {
        if (!state.currentPiece) return;

        const pieceCenterOffset = state.currentPiece.shape[0].length / 2;
        const target = ((state.currentPiece.x + pieceCenterOffset) / CONFIG.GRID_WIDTH) * Math.PI * 2;
        
        state.cameraAngle += (target - state.cameraAngle) * 0.1;

        const camDist = CONFIG.RADIUS + 100; 
        this.camera.position.x = Math.sin(state.cameraAngle) * camDist;
        this.camera.position.z = Math.cos(state.cameraAngle) * camDist;
        
        if (this.cameraShake > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
            this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
            this.camera.position.z += (Math.random() - 0.5) * this.cameraShake;
        }

        this.camera.lookAt(0, CALCULATED.TOTAL_HEIGHT / 2, 0);
    }

    updateEffects() {
        for(let i=this.explosions.length-1; i>=0; i--) {
            const p = this.explosions[i];
            p.userData.life -= 0.03; 
            if(p.userData.life <= 0) {
                this.effectGroup.remove(p);
                // Particle geometry/material disposal is handled by JS GC usually 
                // but strictly should be disposed if not reused.
                // For particles, we create them on the fly. Ideally should use a pool too.
                // But block leak was the main issue.
                p.geometry.dispose();
                p.material.dispose();
                this.explosions.splice(i, 1);
                continue;
            }
            
            p.material.opacity = p.userData.life;
            const positions = p.geometry.attributes.position.array;
            const vels = p.userData.velocities;
            
            for(let j=0; j<positions.length/3; j++) {
                positions[j*3] += vels[j*3];
                positions[j*3+1] += vels[j*3+1];
                positions[j*3+2] += vels[j*3+2];
            }
            p.geometry.attributes.position.needsUpdate = true;
        }

        if(this.cameraShake > 0) {
            this.cameraShake *= 0.9;
            if(this.cameraShake < 0.05) this.cameraShake = 0;
        }

        if(this.particleSystem) {
            this.particleSystem.rotation.y += 0.0005;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(state, checkCollisionFunc, getWrapXFunc) {
        this.updateEffects();
        this.updateCamera(state);
        this.renderActivePiece(state, checkCollisionFunc, getWrapXFunc);
        this.renderer.render(this.scene, this.camera);
    }
}
