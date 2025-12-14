export class TerminalUI {
  constructor() {
    this.contentDiv = document.getElementById("terminal-content");
    this.choiceArea = document.getElementById("choice-area");
    this.inputLine = document.querySelector(".input-line");
    this.terminalLayer = document.getElementById("terminal-layer");

    // 실제 입력 필드 생성 (기존 hidden input-line 대체 또는 활용)
    // HTML에 이미 구조가 있다면 찾아서 쓰고, 없으면 만든다.
    let inputLine = document.querySelector(".input-line");
    if (!inputLine || !inputLine.querySelector("input")) {
      // 기존 span 구조 대신 input 태그로 교체
      if (inputLine) inputLine.remove();
      inputLine = document.createElement("div");
      inputLine.className = "input-line hidden";
      inputLine.innerHTML = `
            <span class="prompt">[USER]></span>
            <input type="text" id="cmd-input" autocomplete="off" spellcheck="false">
        `;
      this.terminalLayer.appendChild(inputLine);
    }

    this.inputLine = inputLine;
    this.cmdInput = this.inputLine.querySelector("input");

    // 커서 엘리먼트 생성 (타이핑 효과용)
    this.cursor = document.createElement("span");
    this.cursor.className = "cursor blinking";

    // 초기화
    if (this.choiceArea) this.choiceArea.classList.add("hidden");

    // 전역 클릭 시 입력창 포커스 (터미널 모드일 때만)
    this.terminalLayer.addEventListener("click", () => {
      if (!this.inputLine.classList.contains("hidden")) {
        this.cmdInput.focus();
      }
    });

    // 엔터키 리스너 (showChoices나 waitForEnter에서 사용)
    this.cmdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.onInputEnter) {
        this.onInputEnter(this.cmdInput.value.trim());
        this.cmdInput.value = ""; // 입력 후 초기화
      }
    });
  }

  // 상점 UI (네트워크 맵) 표시
  showShop(perkManager, currentMoney) {
    return new Promise((resolve) => {
      this.contentDiv.innerHTML = "";

      const shopContainer = document.createElement("div");
      shopContainer.className = "shop-container";

      // 상단 정보
      const header = document.createElement("div");
      header.className = "shop-header";
      header.innerHTML = `
        <div class="shop-title">DARK_WEB_MARKET_V3.0</div>
        <div class="shop-money">AVAILABLE DATA: <span id="shop-money-val">${currentMoney}</span> MB</div>
      `;
      shopContainer.appendChild(header);

      // 노드 맵 컨테이너 (Canvas + DOM Overlay)
      const mapContainer = document.createElement("div");
      mapContainer.className = "node-map";
      shopContainer.appendChild(mapContainer);

      // 나가기 버튼
      const exitBtn = document.createElement("button");
      exitBtn.className = "choice-btn shop-exit";
      exitBtn.textContent = "> DISCONNECT (NEXT STAGE)";
      exitBtn.onclick = () => {
        shopContainer.remove();
        resolve(); // 상점 종료
      };
      shopContainer.appendChild(exitBtn);

      this.contentDiv.appendChild(shopContainer);
      this.renderNodeMap(mapContainer, perkManager, currentMoney);
    });
  }

  renderNodeMap(container, perkManager, currentMoney) {
    const isMobile = window.innerWidth <= 768;
    const tree = perkManager.getTreeStructure();

    // 간단한 그리드 배치 로직 (실제로는 더 복잡한 레이아웃 알고리즘이 필요할 수 있음)
    // Root 노드들을 기준으로 3개 컬럼으로 나눔
    const columns = {
      attack: { x: 20, nodes: [] },
      defense: { x: 50, nodes: [] },
      utility: { x: 80, nodes: [] },
    };

    // 트리 분류
    tree.forEach((perk) => {
      if (columns[perk.type]) columns[perk.type].nodes.push(perk);
    });

    // 노드 그리기
    Object.keys(columns).forEach((type) => {
      const col = columns[type];
      col.nodes.forEach((perk, index) => {
        const nodeEl = document.createElement("div");
        const isAcquired = perkManager.acquiredPerks.has(perk.id);
        const canUnlock = perkManager.canUnlock(perk.id, currentMoney);

        nodeEl.className = `perk-node ${type} ${isAcquired ? "acquired" : ""} ${
          canUnlock ? "unlockable" : "locked"
        }`;
        // 위치 계산 (CSS top/left %)
        nodeEl.style.left = `${col.x}%`;
        nodeEl.style.top = `${20 + index * 25}%`; // 20%, 45%, 70% ...

        const finalCost = perkManager.getDiscountedPrice(perk.cost);

        nodeEl.innerHTML = `
                <div class="perk-icon"></div>
                <div class="perk-info">
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-cost">${
                      isAcquired ? "INSTALLED" : finalCost + " MB"
                    }</div>
                </div>
                <div class="perk-desc">${perk.desc}</div>
            `;

        // 클릭 이벤트
        if (!isAcquired && canUnlock) {
          nodeEl.onclick = () => {
            // 커스텀 확인 창 생성
            const confirmBox = document.createElement("div");
            confirmBox.className = "confirm-box";
            const boxWidth = isMobile ? "90%" : "auto";

            confirmBox.innerHTML = `
              <div class="confirm-msg">Purchase <span style="color:var(--term-color)">${
                perk.name
              }</span>?</div>
              ${
                isMobile
                  ? `<div class="confirm-desc" style="font-size: 14px; color: #aaa; margin: 10px 0;">${perk.desc}</div>`
                  : ""
              }
              <div class="confirm-cost">COST: ${finalCost} MB</div>
              <div class="confirm-btns">
                <button id="confirm-yes">[ YES ]</button>
                <button id="confirm-no">[ NO ]</button>
              </div>
            `;

            // 스타일 주입
            confirmBox.style.position = "fixed"; // absolute -> fixed
            confirmBox.style.top = "50%";
            confirmBox.style.left = "50%";
            confirmBox.style.transform = "translate(-50%, -50%)";
            confirmBox.style.width = boxWidth;
            confirmBox.style.background = "rgba(0, 10, 0, 0.95)";
            confirmBox.style.border = "2px solid var(--term-color)";
            confirmBox.style.padding = "20px";
            confirmBox.style.zIndex = "200";
            confirmBox.style.textAlign = "center";
            confirmBox.style.boxShadow = "0 0 20px rgba(51, 255, 0, 0.3)";

            // 버튼 스타일
            const btns = confirmBox.querySelectorAll("button");
            btns.forEach((btn) => {
              btn.style.background = "transparent";
              btn.style.border = "1px solid var(--term-color)";
              btn.style.color = "var(--term-color)";
              btn.style.margin = "10px";
              btn.style.padding = isMobile ? "10px 20px" : "5px 15px";
              btn.style.cursor = "pointer";
              btn.style.fontFamily = "var(--term-font)";
              btn.style.fontSize = isMobile ? "16px" : "18px";
            });

            // 호버 효과 추가
            btns.forEach((btn) => {
              btn.onmouseenter = () => {
                btn.style.background = "var(--term-color)";
                btn.style.color = "#000";
              };
              btn.onmouseleave = () => {
                btn.style.background = "transparent";
                btn.style.color = "var(--term-color)";
              };
            });

            container.appendChild(confirmBox);

            // 이벤트 핸들링
            confirmBox.querySelector("#confirm-yes").onclick = (e) => {
              e.stopPropagation();
              confirmBox.remove();

              perkManager.unlock(perk.id);
              const event = new CustomEvent("perk-buy", {
                detail: { perkId: perk.id, cost: finalCost },
              });
              document.dispatchEvent(event);
            };

            confirmBox.querySelector("#confirm-no").onclick = (e) => {
              e.stopPropagation();
              confirmBox.remove();
            };
          };
        }

        container.appendChild(nodeEl);

        // 연결선 그리기 (SVG) - 부모가 있다면
        if (perk.parentId) {
          // 부모 좌표 찾기 로직 필요 (생략 가능하거나, 간단히 수직선)
        }
      });
    });
  }
  async typeText(text, speed = 20) {
    if (this.isTyping) await this.waitForTypingEnd();
    this.isTyping = true;
    this.cursor.classList.remove("blinking"); // 타이핑 중엔 깜빡임 중지

    // 새 라인 생성
    const line = document.createElement("div");
    line.className = "terminal-line";
    this.contentDiv.appendChild(line);

    // 커서를 현재 라인으로 이동
    line.appendChild(this.cursor);
    this.scrollToBottom();

    return new Promise((resolve) => {
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
          this.cursor.classList.add("blinking"); // 타이핑 끝, 다시 깜빡임
          resolve();
        }
      };

      // 시작
      typeChar();
    });
  }

  async waitForTypingEnd() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!this.isTyping) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  // 선택지 표시 (버튼 + 텍스트 입력 지원)
  showChoices(choices) {
    return new Promise((resolve) => {
      this.choiceArea.innerHTML = "";

      // 1. 선택지 버튼 렌더링
      choices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        // 인덱스를 1부터 시작하도록 표시 (1. Option)
        const displayIndex = index + 1;
        btn.innerHTML = `<span style="color:var(--term-dim)">[${displayIndex}]</span> ${choice.text}`;

        btn.onclick = () => {
          this.finalizeChoice(choice, resolve);
        };
        this.choiceArea.appendChild(btn);
      });

      this.choiceArea.classList.remove("hidden");
      this.scrollToBottom();

      // 2. 입력 필드 활성화
      this.inputLine.classList.remove("hidden");

      // 모바일이 아닐 때만 자동 포커스 (모바일은 키보드가 화면 가림 방지)
      if (window.innerWidth > 768) {
        this.cmdInput.focus();
      }
      this.scrollToBottom();

      // 3. 입력 처리 핸들러 설정
      this.onInputEnter = (text) => {
        // 인덱스 매칭 (1, 2, 3...)
        const idx = parseInt(text);
        if (!isNaN(idx) && idx >= 1 && idx <= choices.length) {
          this.finalizeChoice(choices[idx - 1], resolve);
          return;
        }

        // 텍스트 매칭 (yes, no, start 등 value 또는 text 일부)
        const lowerText = text.toLowerCase();
        const matched = choices.find(
          (c) =>
            c.value.toString().toLowerCase() === lowerText ||
            c.text.toLowerCase().includes(lowerText)
        );

        if (matched) {
          this.finalizeChoice(matched, resolve);
        } else {
          // 잘못된 명령어 피드백
          this.printSystemMessage(`Command not found: ${text}`);
          this.printSystemMessage(
            `Please type a number (1-${choices.length}) or keyword.`
          );
        }
      };
    });
  }

  finalizeChoice(choice, resolve) {
    this.choiceArea.classList.add("hidden");
    this.inputLine.classList.add("hidden"); // 입력창 숨김
    this.onInputEnter = null; // 핸들러 해제

    // 선택한 내용은 유저 입력처럼 출력
    const line = document.createElement("div");
    line.className = "terminal-line";
    line.innerHTML = `<span style="color:var(--term-color)">[USER]> ${choice.text}</span>`;
    this.contentDiv.appendChild(line);

    resolve(choice.value);
  }

  // 시스템 메시지 (즉시 출력)
  printSystemMessage(text) {
    const line = document.createElement("div");
    line.className = "terminal-line system-msg";
    line.textContent = `[SYSTEM] ${text}`;
    this.contentDiv.appendChild(line);
    this.scrollToBottom();
  }

  // 엔터 대기 (깜빡이는 커서와 함께) - 이제 아무 키나 누르는게 아니라 엔터 입력 대기
  waitForEnter() {
    return new Promise(async (resolve) => {
      // 메시지 타이핑 먼저
      await this.typeText("Press [ENTER] key to initialize connection...", 10);

      // 입력창 활성화
      this.inputLine.classList.remove("hidden");

      // 모바일이 아닐 때만 자동 포커스
      if (window.innerWidth > 768) {
        this.cmdInput.focus();
      }
      this.scrollToBottom();

      this.onInputEnter = (text) => {
        // 엔터키 입력 시 (내용 상관 없음, 혹은 특정 커맨드 요구 가능)
        this.inputLine.classList.add("hidden");
        this.onInputEnter = null;

        // [OK] 추가
        const lastLine = this.contentDiv.lastElementChild;
        if (lastLine) {
          lastLine.insertAdjacentHTML(
            "beforeend",
            " <span style='color:#0f0'>[OK]</span>"
          );
        }
        this.printSystemMessage("Connection established.");
        resolve();
      };
    });
  }

  scrollToBottom() {
    this.terminalLayer.scrollTop = this.terminalLayer.scrollHeight;
  }

  clear() {
    this.contentDiv.innerHTML = "";
    this.contentDiv.appendChild(this.cursor); // 커서는 유지
  }

  hide() {
    this.terminalLayer.style.display = "none";
  }

  show() {
    this.terminalLayer.style.display = "block";
  }

  setTransparentMode(enabled) {
    if (enabled) {
      this.terminalLayer.style.background = "rgba(0,0,0,0)";
      this.terminalLayer.style.pointerEvents = "none";
      // 게임 중에는 텍스트 그림자 더 강하게
      this.terminalLayer.style.textShadow =
        "0 0 3px #000, 0 0 5px var(--term-color)";
      this.cursor.style.display = "none";

      // 게임 중에는 입력창 확실히 숨김 및 포커스 해제
      this.inputLine.classList.add("hidden");
      this.cmdInput.blur();
    } else {
      this.terminalLayer.style.background = "rgba(0, 0, 0, 0.8)"; // 약간의 투명도
      this.terminalLayer.style.pointerEvents = "auto";
      this.terminalLayer.style.textShadow = "0 0 5px var(--term-color)";
      this.cursor.style.display = "inline-block";
    }
  }
}
