export class TerminalUI {
  constructor() {
    this.contentDiv = document.getElementById("terminal-content");
    this.choiceArea = document.getElementById("choice-area");
    this.inputLine = document.querySelector(".input-line");
    this.terminalLayer = document.getElementById("terminal-layer");

    // 커서 엘리먼트 생성 (하나의 커서를 계속 재사용)
    this.cursor = document.createElement("span");
    this.cursor.className = "cursor blinking";

    // 초기화
    if (this.choiceArea) this.choiceArea.classList.add("hidden");
    if (this.inputLine) this.inputLine.classList.add("hidden"); // 기존 하드코딩된 input 라인 숨김

    this.isTyping = false;

    // 클릭하면 마지막으로 스크롤 이동 (편의성)
    this.terminalLayer.addEventListener("click", () => {
      this.inputLine?.querySelector("input")?.focus();
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
            confirmBox.innerHTML = `
              <div class="confirm-msg">Purchase <span style="color:var(--term-color)">${perk.name}</span>?</div>
              <div class="confirm-cost">COST: ${finalCost} MB</div>
              <div class="confirm-btns">
                <button id="confirm-yes">[ YES ]</button>
                <button id="confirm-no">[ NO ]</button>
              </div>
            `;

            // 스타일 주입 (임시)
            confirmBox.style.position = "absolute";
            confirmBox.style.top = "50%";
            confirmBox.style.left = "50%";
            confirmBox.style.transform = "translate(-50%, -50%)";
            confirmBox.style.background = "#000";
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
              btn.style.padding = "5px 15px";
              btn.style.cursor = "pointer";
              btn.style.fontFamily = "var(--term-font)";
              btn.style.fontSize = "18px";
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

  // 선택지 표시 (리스트 형태)
  showChoices(choices) {
    return new Promise((resolve) => {
      this.choiceArea.innerHTML = "";
      // 커서를 선택지 영역 이전으로 옮기지 않고, 마지막 텍스트에 둠.

      choices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.text; // CSS ::before로 [ ] 처리

        btn.onclick = () => {
          this.choiceArea.classList.add("hidden");
          // 선택한 내용은 시스템 로그처럼 남김
          this.printSystemMessage(`Selection confirmed: ${choice.text}`);
          resolve(choice.value);
        };

        this.choiceArea.appendChild(btn);
      });

      this.choiceArea.classList.remove("hidden");
      this.scrollToBottom();
    });
  }

  // 시스템 메시지 (즉시 출력)
  printSystemMessage(text) {
    const line = document.createElement("div");
    line.className = "terminal-line system-msg";
    line.textContent = `[SYSTEM] ${text}`;
    this.contentDiv.appendChild(line);
    this.scrollToBottom();
  }

  // 엔터 대기 (깜빡이는 커서와 함께)
  waitForEnter() {
    return new Promise(async (resolve) => {
      // 메시지 타이핑 먼저
      await this.typeText("Press [ENTER] key to initialize connection...", 10);

      const handler = (e) => {
        if (e.key === "Enter") {
          cleanup();
          resolve();
        }
      };

      const touchHandler = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        document.removeEventListener("keydown", handler);
        document.removeEventListener("touchstart", touchHandler);
        // 엔터 누르면 해당 라인에 ' OK' 추가
        const lastLine = this.contentDiv.lastElementChild;
        if (lastLine) {
          lastLine.insertBefore(document.createTextNode(" [OK]"), this.cursor);
        }
        this.printSystemMessage("Connection established.");
      };

      document.addEventListener("keydown", handler);
      document.addEventListener("touchstart", touchHandler);
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
    } else {
      this.terminalLayer.style.background = "rgba(0, 0, 0, 0.8)"; // 약간의 투명도
      this.terminalLayer.style.pointerEvents = "auto";
      this.terminalLayer.style.textShadow = "0 0 5px var(--term-color)";
      this.cursor.style.display = "inline-block";
    }
  }
}
