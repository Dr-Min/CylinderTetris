export class TerminalUI {
    constructor() {
        this.contentDiv = document.getElementById('terminal-content');
        this.choiceArea = document.getElementById('choice-area');
        // 초기화 시 확실히 숨김
        if(this.choiceArea) this.choiceArea.classList.add('hidden');
        this.inputLine = document.querySelector('.input-line');
        this.terminalLayer = document.getElementById('terminal-layer');
        this.isTyping = false;
    }

    async typeText(text, speed = 30) {
        if (this.isTyping) return; // 중복 호출 방지
        this.isTyping = true;
        
        const p = document.createElement('div');
        p.className = 'terminal-text';
        this.contentDiv.appendChild(p);

        // 스크롤 아래로
        this.contentDiv.scrollTop = this.contentDiv.scrollHeight;

        return new Promise(resolve => {
            let i = 0;
            const interval = setInterval(() => {
                p.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    this.isTyping = false;
                    resolve();
                }
                // 타이핑 중에도 스크롤 유지
                this.contentDiv.scrollTop = this.contentDiv.scrollHeight;
            }, speed);
        });
    }

    showChoices(choices) {
        return new Promise(resolve => {
            this.choiceArea.innerHTML = '';
            
            choices.forEach((choice, index) => {
                const btn = document.createElement('button'); // span -> button 변경
                btn.className = 'choice-btn'; // choice-item -> choice-btn 변경 (css 일치)
                btn.textContent = `> ${choice.text}`; // [ ] 대신 > 사용
                
                btn.onclick = () => {
                    this.choiceArea.classList.add('hidden'); // style.display 직접 제어 대신 클래스 토글
                    this.printSystemMessage(`> ${choice.text}`);
                    resolve(choice.value);
                };

                this.choiceArea.appendChild(btn);
            });
            
            // 컨테이너 표시 (hidden 클래스 제거)
            this.choiceArea.classList.remove('hidden');
        });
    }

    printSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'terminal-text';
        div.style.color = '#888'; // 시스템 메시지는 회색
        div.textContent = text;
        this.contentDiv.appendChild(div);
        this.contentDiv.scrollTop = this.contentDiv.scrollHeight;
    }

    waitForEnter() {
        return new Promise(resolve => {
            const msg = document.createElement('div');
            msg.className = 'terminal-text';
            msg.innerHTML = '<span class="blink">Press ENTER to initiate hack...</span>';
            this.contentDiv.appendChild(msg);
            
            const handler = (e) => {
                if (e.key === 'Enter') {
                    document.removeEventListener('keydown', handler);
                    msg.remove(); // 메시지 제거
                    resolve();
                }
            };
            document.addEventListener('keydown', handler);
            
            // 모바일 지원을 위해 터치 이벤트도 추가
            const touchHandler = () => {
                document.removeEventListener('touchstart', touchHandler);
                msg.remove();
                resolve();
            }
            document.addEventListener('touchstart', touchHandler);
        });
    }

    clear() {
        this.contentDiv.innerHTML = '';
    }

    hide() {
        this.terminalLayer.style.display = 'none';
    }

    show() {
        this.terminalLayer.style.display = 'flex';
    }
    
    // 게임 모드에서 오버레이로 사용하기 위해 배경 투명화
    setTransparentMode(enabled) {
        if(enabled) {
            this.terminalLayer.style.background = 'rgba(0,0,0,0)';
            this.terminalLayer.style.pointerEvents = 'none'; // 클릭 통과
        } else {
            this.terminalLayer.style.background = 'rgba(0, 10, 0, 0.9)';
            this.terminalLayer.style.pointerEvents = 'auto';
        }
    }
}
