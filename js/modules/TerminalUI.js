export class TerminalUI {
    constructor() {
        this.contentDiv = document.getElementById('terminal-content');
        this.choiceArea = document.getElementById('choice-area');
        this.inputLine = document.querySelector('.input-line');
        this.terminalLayer = document.getElementById('terminal-layer');
        
        // 커서 엘리먼트 생성 (하나의 커서를 계속 재사용)
        this.cursor = document.createElement('span');
        this.cursor.className = 'cursor blinking';
        
        // 초기화
        if(this.choiceArea) this.choiceArea.classList.add('hidden');
        if(this.inputLine) this.inputLine.classList.add('hidden'); // 기존 하드코딩된 input 라인 숨김
        
        this.isTyping = false;
        
        // 클릭하면 마지막으로 스크롤 이동 (편의성)
        this.terminalLayer.addEventListener('click', () => {
            this.inputLine?.querySelector('input')?.focus();
        });
    }

    // 진짜 터미널처럼 한 글자씩 타이핑
    async typeText(text, speed = 20) {
        if (this.isTyping) await this.waitForTypingEnd();
        this.isTyping = true;
        this.cursor.classList.remove('blinking'); // 타이핑 중엔 깜빡임 중지

        // 새 라인 생성
        const line = document.createElement('div');
        line.className = 'terminal-line';
        this.contentDiv.appendChild(line);
        
        // 커서를 현재 라인으로 이동
        line.appendChild(this.cursor);
        this.scrollToBottom();

        return new Promise(resolve => {
            let i = 0;
            
            const typeChar = () => {
                if (i < text.length) {
                    // 현재 글자
                    const char = text.charAt(i);
                    
                    // 텍스트 노드로 추가 (HTML 태그가 아닌 순수 텍스트 처리)
                    // 커서 바로 앞에 글자 삽입
                    line.insertBefore(document.createTextNode(char), this.cursor);
                    
                    i++;
                    this.scrollToBottom();
                    
                    // 랜덤 딜레이로 기계적인 느낌 탈피
                    const randomSpeed = speed + (Math.random() * 20 - 10); 
                    setTimeout(typeChar, randomSpeed);
                } else {
                    this.isTyping = false;
                    this.cursor.classList.add('blinking'); // 타이핑 끝, 다시 깜빡임
                    resolve();
                }
            };
            
            // 시작
            typeChar();
        });
    }

    async waitForTypingEnd() {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (!this.isTyping) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        });
    }

    // 선택지 표시 (리스트 형태)
    showChoices(choices) {
        return new Promise(resolve => {
            this.choiceArea.innerHTML = '';
            // 커서를 선택지 영역 이전으로 옮기지 않고, 마지막 텍스트에 둠.
            
            choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.textContent = choice.text; // CSS ::before로 [ ] 처리
                
                btn.onclick = () => {
                    this.choiceArea.classList.add('hidden');
                    // 선택한 내용은 시스템 로그처럼 남김
                    this.printSystemMessage(`Selection confirmed: ${choice.text}`);
                    resolve(choice.value);
                };

                this.choiceArea.appendChild(btn);
            });
            
            this.choiceArea.classList.remove('hidden');
            this.scrollToBottom();
        });
    }

    // 시스템 메시지 (즉시 출력)
    printSystemMessage(text) {
        const line = document.createElement('div');
        line.className = 'terminal-line system-msg';
        line.textContent = `[SYSTEM] ${text}`;
        this.contentDiv.appendChild(line);
        this.scrollToBottom();
    }

    // 엔터 대기 (깜빡이는 커서와 함께)
    waitForEnter() {
        return new Promise(async resolve => {
            // 메시지 타이핑 먼저
            await this.typeText("Press [ENTER] key to initialize connection...", 10);
            
            const handler = (e) => {
                if (e.key === 'Enter') {
                    cleanup();
                    resolve();
                }
            };
            
            const touchHandler = () => {
                cleanup();
                resolve();
            }

            const cleanup = () => {
                document.removeEventListener('keydown', handler);
                document.removeEventListener('touchstart', touchHandler);
                // 엔터 누르면 해당 라인에 ' OK' 추가
                const lastLine = this.contentDiv.lastElementChild;
                if(lastLine) {
                     lastLine.insertBefore(document.createTextNode(" [OK]"), this.cursor);
                }
                this.printSystemMessage("Connection established.");
            };

            document.addEventListener('keydown', handler);
            document.addEventListener('touchstart', touchHandler);
        });
    }

    scrollToBottom() {
        this.terminalLayer.scrollTop = this.terminalLayer.scrollHeight;
    }

    clear() {
        this.contentDiv.innerHTML = '';
        this.contentDiv.appendChild(this.cursor); // 커서는 유지
    }

    hide() {
        this.terminalLayer.style.display = 'none';
    }

    show() {
        this.terminalLayer.style.display = 'block';
    }
    
    setTransparentMode(enabled) {
        if(enabled) {
            this.terminalLayer.style.background = 'rgba(0,0,0,0)';
            this.terminalLayer.style.pointerEvents = 'none';
            // 게임 중에는 텍스트 그림자 더 강하게
            this.terminalLayer.style.textShadow = '0 0 3px #000, 0 0 5px var(--term-color)';
        } else {
            this.terminalLayer.style.background = 'rgba(0, 0, 0, 0.8)'; // 약간의 투명도
            this.terminalLayer.style.pointerEvents = 'auto';
            this.terminalLayer.style.textShadow = '0 0 5px var(--term-color)';
        }
    }
}