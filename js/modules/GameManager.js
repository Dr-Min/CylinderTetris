import { TerminalUI } from './TerminalUI.js';
import { TetrisGame } from './TetrisGame.js';

export class GameManager {
    constructor() {
        this.terminal = new TerminalUI();
        this.game = new TetrisGame('game-container');
        this.state = 'INTRO'; // INTRO, LOBBY, GAMING
    }

    async init() {
        this.game.init(); // 3D 씬 미리 로드 (백그라운드)
        await this.startIntro();
    }

    async startIntro() {
        await this.terminal.typeText("Establishing secure connection...", 10);
        await new Promise(r => setTimeout(r, 500));
        await this.terminal.typeText("Connection established.", 10);
        await new Promise(r => setTimeout(r, 1000));
        this.terminal.clear();

        await this.terminal.typeText("반갑다. 너가 그 해커구나.", 50);
        await new Promise(r => setTimeout(r, 800));
        await this.terminal.typeText("방법은 잘 알고 있겠지?", 50);

        const choice = await this.terminal.showChoices([
            { text: "그럼", value: "yes" },
            { text: "아니", value: "no" }
        ]);

        if (choice === 'no') {
            await this.terminal.typeText("\n[SYSTEM] 튜토리얼 데이터 로드 실패... 패킷 손실 감지.", 30);
            await this.terminal.typeText("...어쩔 수 없지. 실전에서 배우도록 해.", 50);
        } else {
            await this.terminal.typeText("\n좋아. 바로 본론으로 들어가지.", 50);
        }

        await new Promise(r => setTimeout(r, 1000));
        this.enterLobby();
    }

    async enterLobby() {
        this.state = 'LOBBY';
        this.terminal.clear();
        
        await this.terminal.typeText("Target: Firewall_Level_1", 20);
        await this.terminal.typeText("Status: Online", 20);
        await this.terminal.typeText("\n자, 진입. 간단한 방화벽이야.", 50);
        
        await this.terminal.waitForEnter();
        
        this.startGame();
    }

    startGame() {
        this.state = 'GAMING';
        this.terminal.printSystemMessage("Injecting payload...");
        
        // 터미널 페이드 아웃 및 게임 화면 페이드 인
        setTimeout(() => {
            document.getElementById('game-container').style.opacity = 1;
            document.getElementById('game-ui').style.display = 'block';
            this.terminal.setTransparentMode(true); // 터미널을 배경으로 남길지, 아예 숨길지 결정. 여기선 투명화
            this.terminal.clear(); // 게임 중엔 로그만 남길 수도 있음
            
            this.game.startGame();
        }, 1000);
    }
}
