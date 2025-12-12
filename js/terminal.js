export class Terminal {
    constructor(elementId, options = {}) {
        this.container = document.getElementById(elementId);
        this.contentDiv = this.container.querySelector('#terminal-content');
        this.inputLine = this.container.querySelector('.input-line');
        this.userInput = this.container.querySelector('#user-input');
        this.choiceArea = this.container.querySelector('#choice-area');
        
        this.typingSpeed = options.typingSpeed || 50;
        this.isTyping = false;
        this.soundEnabled = true;
    }

    // 텍스트 타이핑 효과 출력
    async typeText(text, speed = this.typingSpeed) {
        return new Promise((resolve) => {
            const p = document.createElement('p');
            this.contentDiv.appendChild(p);
            
            // 자동 스크롤
            this.scrollToBottom();

            let i = 0;
            this.isTyping = true;
            
            const interval = setInterval(() => {
                if (i < text.length) {
                    p.textContent += text.charAt(i);
                    i++;
                    this.scrollToBottom();
                    if (this.soundEnabled && i % 3 === 0) {
                        // 타이핑 사운드 재생 가능 (추후 구현)
                    }
                } else {
                    clearInterval(interval);
                    this.isTyping = false;
                    resolve();
                }
            }, speed);
        });
    }

    // 줄바꿈이 포함된 긴 텍스트 출력 (여러 p 태그 생성)
    async printLog(messages, speed = this.typingSpeed) {
        if (!Array.isArray(messages)) messages = [messages];
        
        for (const msg of messages) {
            await this.typeText(msg, speed);
            await new Promise(r => setTimeout(r, 300)); // 줄 간 딜레이
        }
    }

    // 선택지 표시
    async showChoices(choices) {
        return new Promise((resolve) => {
            this.choiceArea.innerHTML = '';
            this.choiceArea.classList.remove('hidden');
            
            choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.textContent = `> ${choice.text}`;
                
                btn.onclick = () => {
                    this.choiceArea.classList.add('hidden');
                    this.printLog(`> ${choice.text}`, 0); // 선택한 텍스트 출력
                    resolve(choice.value);
                };
                
                this.choiceArea.appendChild(btn);
            });
            this.scrollToBottom();
        });
    }

    // Enter 키 대기
    async awaitEnter() {
        return new Promise((resolve) => {
            this.inputLine.classList.remove('hidden');
            this.userInput.textContent = "Press Enter to continue...";
            this.scrollToBottom();

            const handler = (e) => {
                if (e.key === 'Enter') {
                    document.removeEventListener('keydown', handler);
                    this.inputLine.classList.add('hidden');
                    this.userInput.textContent = "";
                    resolve();
                }
            };
            document.addEventListener('keydown', handler);
        });
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    clear() {
        this.contentDiv.innerHTML = '';
    }

    hide() {
        this.container.style.display = 'none';
    }

    show() {
        this.container.style.display = 'block';
    }
}

