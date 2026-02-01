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

    // 커서 엘리먼트 제거됨 (사용하지 않음)
    this.cursor = null;

    // 초기화
    if (this.choiceArea) this.choiceArea.classList.add("hidden");
    
    // DATA 표시 ([USER] 밑에)
    this.dataDisplay = document.createElement("div");
    this.dataDisplay.id = "terminal-data-display";
    this.dataDisplay.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: inherit;
      margin-top: 5px;
      text-shadow: 0 0 5px #00f0ff;
    `;
    this.dataDisplay.innerText = "DATA: 0 MB";
    // inputLine 바로 뒤에 추가
    this.inputLine.after(this.dataDisplay);
    
    // PAGE 표시 (DATA 밑에)
    this.pageDisplay = document.createElement("div");
    this.pageDisplay.id = "terminal-page-display";
    this.pageDisplay.style.cssText = `
      color: #00ff00;
      font-family: var(--term-font);
      font-size: inherit;
      margin-top: 2px;
      text-shadow: 0 0 5px #00ff00;
    `;
    this.pageDisplay.innerText = "SAFE ZONE";
    // dataDisplay 바로 뒤에 추가
    this.dataDisplay.after(this.pageDisplay);

    // PAGE skip button (shown only during PAGE display)
    this.pageSkipBtn = document.createElement("button");
    this.pageSkipBtn.id = "terminal-page-skip";
    this.pageSkipBtn.style.cssText = `
      margin-top: 4px;
      padding: 4px 8px;
      font-family: var(--term-font);
      font-size: 11px;
      color: #00f0ff;
      background: rgba(0, 20, 40, 0.6);
      border: 1px solid #00f0ff;
      cursor: pointer;
      pointer-events: auto;
      display: none;
    `;
    this.pageSkipBtn.innerText = "SKIP PAGE";
    this.pageSkipBtn.onclick = () => {
      if (this.onPageSkip) this.onPageSkip();
    };
    this.pageDisplay.after(this.pageSkipBtn);

    // 입력창 직접 클릭 시에만 포커스 (화면 터치로 키보드 올라오는 문제 방지)
    this.cmdInput.addEventListener("click", (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      this.cmdInput.focus();
    });
    
    // inputLine 클릭 시에도 포커스
    this.inputLine.addEventListener("click", (e) => {
      e.stopPropagation();
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

  // 데이터 마이닝 완료 연출
  async showMiningCompleteSequence() {
    return new Promise((resolve) => {
      // 1. 오버레이 생성
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0, 0, 0, 0.5)";
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.zIndex = "2000";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.5s";

      const text = document.createElement("div");
      text.innerText = "DATA MINING COMPLETE";
      text.style.color = "var(--term-color)";
      text.style.fontSize = "40px";
      text.style.fontWeight = "bold";
      text.style.textShadow = "0 0 20px var(--term-color)";
      text.style.letterSpacing = "5px";
      text.style.textAlign = "center";

      const subText = document.createElement("div");
      subText.innerText = "UPLOADING TO SERVER...";
      subText.style.color = "#fff";
      subText.style.fontSize = "16px";
      subText.style.marginTop = "20px";
      subText.className = "blinking";

      overlay.appendChild(text);
      overlay.appendChild(subText);

      // 모바일 폰트 조정
      if (window.innerWidth <= 768) {
        text.style.fontSize = "24px";
        subText.style.fontSize = "12px";
      }

      document.body.appendChild(overlay);

      // 2. 페이드 인
      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
      });

      // 3. 2초 대기 후 종료
      setTimeout(() => {
        overlay.style.transition = "opacity 0.5s";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 500);
      }, 2500);
    });
  }

  // 영구 상점 UI (노드 맵 스타일) 표시
  showPermanentShop(permTree, acquiredMap, reputation) {
    return new Promise((resolve) => {
      this.contentDiv.innerHTML = "";

      const shopContainer = document.createElement("div");
      shopContainer.className = "shop-container";

      // 상단 정보
      const header = document.createElement("div");
      header.className = "shop-header";
      header.innerHTML = `
        <div class="shop-title">SYSTEM_KERNEL_ACCESS</div>
        <div class="shop-money">REP LEVEL: <span id="shop-money-val">${reputation}</span></div>
      `;
      shopContainer.appendChild(header);

      // 노드 맵 컨테이너
      const mapContainer = document.createElement("div");
      mapContainer.className = "node-map";
      // 트리 구조 데이터가 플랫 배열로 오므로, 렌더링 로직에서 분류해야 함
      shopContainer.appendChild(mapContainer);

      // 나가기 버튼
      const exitBtn = document.createElement("button");
      exitBtn.className = "choice-btn shop-exit";
      exitBtn.textContent = "> DISCONNECT (SAVE & EXIT)";
      exitBtn.onclick = () => {
        shopContainer.remove();
        resolve();
      };
      shopContainer.appendChild(exitBtn);

      this.contentDiv.appendChild(shopContainer);
      this.renderPermanentNodeMap(
        mapContainer,
        permTree,
        acquiredMap,
        reputation
      );
    });
  }

  // 영구 퍽 노드 맵 렌더링
  renderPermanentNodeMap(container, permTree, acquiredMap, reputation) {
    const isMobile = window.innerWidth <= 768;

    // 데이터 분류 (id prefix 기반: res, eff, luck)
    // 트리 구조 시각화를 위해 그룹핑
    const columns = {
      res: { title: "RESOURCE", nodes: [] },
      eff: { title: "EFFICIENCY", nodes: [] },
      luck: { title: "LUCK", nodes: [] },
    };

    // 루트는 별도 처리하거나 첫 번째 컬럼에 포함? -> 루트는 공통이므로 상단 중앙에 배치하는게 좋지만
    // 여기서는 간단하게 각 컬럼의 부모로 간주하거나, 별도 섹션으로 뺌.
    // 하지만 현재 데이터 구조상 root가 부모임.
    // 시각적으로 Root를 맨 위에 두고 3갈래로 뻗는게 멋짐.

    // root 찾기
    const rootNode = permTree.find((n) => n.id === "root");

    // 나머지 분류
    permTree.forEach((node) => {
      if (node.id === "root") return;
      if (node.id.startsWith("res")) columns.res.nodes.push(node);
      else if (node.id.startsWith("eff")) columns.eff.nodes.push(node);
      else if (node.id.startsWith("luck")) columns.luck.nodes.push(node);
    });

    // 1. Root 노드 렌더링
    if (rootNode) {
      const rootContainer = document.createElement("div");
      rootContainer.style.display = "flex";
      rootContainer.style.justifyContent = "center";
      rootContainer.style.marginBottom = "40px";
      rootContainer.style.width = "100%";

      const rootEl = this.createPermNodeEl(
        rootNode,
        acquiredMap,
        reputation,
        isMobile
      );
      rootContainer.appendChild(rootEl);
      container.appendChild(rootContainer);
    }

    // 2. 3개 컬럼 컨테이너 (Flex)
    const columnsContainer = document.createElement("div");
    columnsContainer.style.display = "flex";
    columnsContainer.style.justifyContent = isMobile
      ? "flex-start"
      : "space-around";
    columnsContainer.style.width = "100%";
    columnsContainer.style.gap = "20px";

    if (isMobile) {
      // Mobile: Vertical Layout + Wrap (Compact Grid)
      container.style.flexDirection = "column";
      container.style.alignItems = "stretch"; // 너비 꽉 채우기
      container.style.overflowX = "hidden"; // 가로 스크롤 제거
      container.style.overflowY = "auto";   // 세로 스크롤 허용
      container.style.paddingBottom = "20px";
    }

    // 3. 각 컬럼 렌더링
    Object.values(columns).forEach((col) => {
      const colEl = document.createElement("div");
      colEl.className = "tree-column"; // 기존 CSS 활용
      colEl.innerHTML = `<div class="column-title">${col.title}</div>`;
      colEl.style.display = "flex";
      colEl.style.flexDirection = isMobile ? "row" : "column"; // 모바일은 가로(Row) + Wrap
      colEl.style.flexWrap = isMobile ? "wrap" : "nowrap";     // 모바일은 줄바꿈
      colEl.style.justifyContent = isMobile ? "center" : "flex-start"; // 중앙 정렬
      colEl.style.alignItems = "center";
      colEl.style.gap = isMobile ? "10px" : "30px"; // 간격 축소
      colEl.style.minWidth = isMobile ? "100%" : "30%";
      colEl.style.marginBottom = isMobile ? "20px" : "0";

      col.nodes.forEach((node, index) => {
        const nodeEl = this.createPermNodeEl(
          node,
          acquiredMap,
          reputation,
          isMobile
        );

        // 연결선 (자식 -> 부모) 시각화는 PC에서만 표시하거나 모바일은 생략
        if (!isMobile && index < col.nodes.length - 1) {
          const arrow = document.createElement("div");
          arrow.className = "connector-arrow";
          arrow.innerText = "▼";
          colEl.appendChild(nodeEl);
          colEl.appendChild(arrow);
        } else {
          colEl.appendChild(nodeEl);
        }
      });

      columnsContainer.appendChild(colEl);
    });

    container.appendChild(columnsContainer);
  }

  createPermNodeEl(node, acquiredMap, reputation, isMobile) {
    const nodeEl = document.createElement("div");
    const currentLevel = acquiredMap.get(node.id) || 0;
    const maxLevel = node.maxLevel || 1;

    const isAcquired = currentLevel > 0;
    const isMaxed = currentLevel >= maxLevel;
    // 부모 해금 여부
    const parentAcquired = node.parentId
      ? (acquiredMap.get(node.parentId) || 0) > 0
      : true;
    const isUnlockable = !isMaxed && parentAcquired;

    // 스타일 클래스
    let statusClass = "locked";
    if (isMaxed) statusClass = "acquired"; // 마스터는 acquired 스타일 (초록)
    else if (isAcquired) statusClass = "acquired"; // 진행 중도 초록
    else if (isUnlockable) statusClass = "unlockable"; // 해금 가능 (점멸)

    // 잠겨있으면 locked
    if (!isUnlockable && !isAcquired) statusClass = "locked";

    nodeEl.className = `perk-node ${statusClass}`;

    // CSS 직접 주입 (Compact Mode)
    nodeEl.style.position = "relative";
    nodeEl.style.width = isMobile ? "80px" : "100px";
    nodeEl.style.height = isMobile ? "80px" : "100px";
    nodeEl.style.left = "auto";
    nodeEl.style.top = "auto";
    nodeEl.style.transform = "none";
    nodeEl.style.marginBottom = "0";
    nodeEl.style.display = "flex";
    nodeEl.style.flexDirection = "column";
    nodeEl.style.justifyContent = "center";
    nodeEl.style.alignItems = "center";
    nodeEl.style.textAlign = "center";

    // 내용 구성 (간소화)
    const shortName = node.name.split("_")[0].substring(0, 8);
    nodeEl.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 5px;">⚡</div>
        <div style="font-size: 12px; font-weight: bold;">${shortName}</div>
        <div style="font-size: 10px; color: #aaa;">Lv.${currentLevel}/${maxLevel}</div>
    `;

    // 클릭 이벤트 (구매 팝업)
    // 잠겨있어도 정보는 볼 수 있게 할까? -> 일단 해금 가능한 것만 클릭되게 (기존 로직 유지)
    // 하지만 사용자가 "그걸 누르면 그때 뭔지 설명만 나오는거야"라고 했으므로,
    // 잠긴 것도 눌러서 정보는 볼 수 있게 하는게 좋음.
    // 여기선 일단 isUnlockable이거나 isAcquired인 경우만.

    if (isUnlockable || isAcquired) {
      nodeEl.onclick = () => {
        // Confirm Box
        const container =
          document.querySelector(".shop-container") || this.contentDiv;
        const confirmBox = document.createElement("div");
        confirmBox.className = "confirm-box";

        // 상세 정보 표시
        confirmBox.innerHTML = `
              <div class="confirm-msg" style="font-size: 20px; border-bottom: 1px solid var(--term-color); padding-bottom: 10px; margin-bottom: 10px;">${
                node.name
              }</div>
              <div class="confirm-desc" style="font-size: 16px; color: #ddd; margin: 20px 0; line-height: 1.5;">
                ${node.desc}
              </div>
              <div class="confirm-level" style="margin-bottom: 10px; color: #aaa;">
                Level: ${currentLevel} / ${maxLevel}
              </div>
              <div class="confirm-cost" style="font-size: 18px; color: var(--term-color);">
                COST: ${isMaxed ? "MASTERED" : node.cost + " REP"}
              </div>
              <div class="confirm-btns">
                ${
                  isUnlockable
                    ? '<button id="confirm-yes">[ UPGRADE ]</button>'
                    : ""
                }
                <button id="confirm-no">[ CLOSE ]</button>
              </div>
            `;

        // 스타일 (JS로 강제 주입하여 위치 잡기)
        confirmBox.style.position = "fixed";
        confirmBox.style.top = "50%";
        confirmBox.style.left = "50%";
        confirmBox.style.transform = "translate(-50%, -50%)";
        confirmBox.style.background = "rgba(0,10,0,0.98)";
        confirmBox.style.border = "2px solid var(--term-color)";
        confirmBox.style.padding = "30px";
        confirmBox.style.zIndex = "300";
        confirmBox.style.textAlign = "center";
        confirmBox.style.width = isMobile ? "90%" : "400px";
        confirmBox.style.boxShadow = "0 0 30px rgba(51, 255, 0, 0.5)";

        container.appendChild(confirmBox);

        if (isUnlockable) {
          confirmBox.querySelector("#confirm-yes").onclick = (e) => {
            e.stopPropagation();
            confirmBox.remove();

            // 구매 이벤트 발송 (GameManager가 수신)
            const event = new CustomEvent("perm-upgrade", {
              detail: { nodeId: node.id, cost: node.cost },
            });
            document.dispatchEvent(event);
          };
        }

        confirmBox.querySelector("#confirm-no").onclick = (e) => {
          e.stopPropagation();
          confirmBox.remove();
        };
      };
    }

    return nodeEl;
  }

  // 아스키 트리 렌더링 (삭제됨 - 하위 호환 없음)
  async showPermanentTree(treeData, acquiredSet, reputation) {
    console.warn(
      "showPermanentTree is deprecated. Redirecting to showPermanentShop."
    );
    return this.showPermanentShop(treeData, acquiredSet, reputation);
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

    // 1. 트리 데이터 분류 (타입별로)
    const columns = {
      attack: { title: "EXPLOIT (ATK)", nodes: [] },
      defense: { title: "SECURITY (DEF)", nodes: [] },
      utility: { title: "UTILITY (MSC)", nodes: [] },
    };

    tree.forEach((perk) => {
      if (columns[perk.type]) columns[perk.type].nodes.push(perk);
    });

    // 2. Flexbox 기반 레이아웃 생성
    // 전체 컨테이너는 Flex Row (PC) 또는 Column (Mobile)
    container.style.display = "flex";
    container.style.flexDirection = isMobile ? "column" : "row"; // 모바일 세로 배치
    container.style.justifyContent = isMobile ? "flex-start" : "space-around";
    container.style.gap = "20px";
    
    if (isMobile) {
      container.style.overflowY = "auto";   // 세로 스크롤 허용
      container.style.overflowX = "hidden"; // 가로 스크롤 금지
      container.style.paddingBottom = "50px"; // 하단 여백 확보
      container.style.width = "100%";
      container.style.height = "100%"; // 컨테이너 높이 확보
    }

    Object.keys(columns).forEach((type) => {
      const colData = columns[type];

      // 컬럼 컨테이너
      const colEl = document.createElement("div");
      colEl.className = "tree-column";
      colEl.innerHTML = `<div class="column-title">${colData.title}</div>`;

      // 스타일 직접 주입 (CSS 클래스로 뺄 수도 있음)
      colEl.style.display = "flex";
      // 모바일에서는 내부 아이템들을 가로로 나열(Wrap)하여 그리드처럼 보이게 함
      colEl.style.flexDirection = isMobile ? "row" : "column"; 
      colEl.style.flexWrap = isMobile ? "wrap" : "nowrap";
      colEl.style.justifyContent = isMobile ? "center" : "flex-start";
      colEl.style.alignItems = "center";
      colEl.style.minWidth = isMobile ? "100%" : "30%";
      colEl.style.gap = isMobile ? "10px" : "40px"; // 모바일 간격 축소
      colEl.style.marginBottom = isMobile ? "20px" : "0";

      // 노드 렌더링 (순서대로)
      // 부모-자식 관계가 있으므로 순서가 보장되어야 함 (현재 데이터는 순서대로임)
      colData.nodes.forEach((perk, index) => {
        const nodeEl = document.createElement("div");
        const isAcquired = perkManager.acquiredPerks.has(perk.id);
        const canUnlock = perkManager.canUnlock(perk.id, currentMoney);

        nodeEl.className = `perk-node ${type} ${isAcquired ? "acquired" : ""} ${
          canUnlock ? "unlockable" : "locked"
        }`;

        // 절대 위치 제거하고 상대 위치로 (Compact Mode)
        nodeEl.style.position = "relative";
        nodeEl.style.left = "auto";
        nodeEl.style.top = "auto";
        nodeEl.style.transform = "none";
        nodeEl.style.width = isMobile ? "80px" : "100px";
        nodeEl.style.height = isMobile ? "80px" : "100px";
        nodeEl.style.display = "flex";
        nodeEl.style.flexDirection = "column";
        nodeEl.style.justifyContent = "center";
        nodeEl.style.alignItems = "center";
        nodeEl.style.textAlign = "center";

        const finalCost = perkManager.getDiscountedPrice(perk.cost);

        // 간소화된 내용 (아이콘/이름 약어)
        const shortName = perk.name.split("_")[0].substring(0, 8); // 이름 축약
        nodeEl.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 5px;">📦</div>
            <div style="font-size: 12px; font-weight: bold;">${shortName}</div>
            ${
              isAcquired
                ? '<div style="color:#0f0; font-size:10px;">[ON]</div>'
                : ""
            }
        `;

        // 클릭 이벤트 (상세 정보 팝업)
        nodeEl.onclick = () => {
          // 커스텀 확인 창 생성 (상세 정보 포함)
          const confirmBox = document.createElement("div");
          confirmBox.className = "confirm-box";
          const boxWidth = isMobile ? "90%" : "400px";

          confirmBox.innerHTML = `
              <div class="confirm-msg" style="font-size: 20px; border-bottom: 1px solid var(--term-color); padding-bottom: 10px; margin-bottom: 10px;">${
                perk.name
              }</div>
              <div class="confirm-desc" style="font-size: 16px; color: #ddd; margin: 20px 0; line-height: 1.5;">
                ${perk.desc}
              </div>
              <div class="confirm-cost" style="font-size: 18px; color: var(--term-color);">
                COST: ${isAcquired ? "ACQUIRED" : finalCost + " MB"}
              </div>
              <div class="confirm-btns">
                ${
                  !isAcquired && canUnlock
                    ? '<button id="confirm-yes">[ PURCHASE ]</button>'
                    : ""
                }
                <button id="confirm-no">[ CLOSE ]</button>
              </div>
            `;

          // 스타일 주입
          confirmBox.style.position = "fixed";
          confirmBox.style.top = "50%";
          confirmBox.style.left = "50%";
          confirmBox.style.transform = "translate(-50%, -50%)";
          confirmBox.style.width = boxWidth;
          confirmBox.style.background = "rgba(0, 10, 0, 0.98)";
          confirmBox.style.border = "2px solid var(--term-color)";
          confirmBox.style.padding = "30px";
          confirmBox.style.zIndex = "300";
          confirmBox.style.textAlign = "center";
          confirmBox.style.boxShadow = "0 0 30px rgba(51, 255, 0, 0.5)";

          container.appendChild(confirmBox);

          if (!isAcquired && canUnlock) {
            confirmBox.querySelector("#confirm-yes").onclick = (e) => {
              e.stopPropagation();
              confirmBox.remove();
              perkManager.unlock(perk.id);
              const event = new CustomEvent("perk-buy", {
                detail: { perkId: perk.id, cost: finalCost },
              });
              document.dispatchEvent(event);
            };
          }

          confirmBox.querySelector("#confirm-no").onclick = (e) => {
            e.stopPropagation();
            confirmBox.remove();
          };
        };

        colEl.appendChild(nodeEl);
      });

      container.appendChild(colEl);
    });
  }
  async typeText(text, speed = 20) {
    if (this.isTyping) await this.waitForTypingEnd();
    this.isTyping = true;

    // 새 라인 생성
    const line = document.createElement("div");
    line.className = "terminal-line";
    this.contentDiv.appendChild(line);
    // limitLines 제거 - 메시지 축적 유지
    this.scrollToBottom();

    return new Promise((resolve) => {
      let i = 0;

      const typeChar = () => {
        if (i < text.length) {
          // 현재 글자
          const char = text.charAt(i);

          // 텍스트 노드로 추가
          line.appendChild(document.createTextNode(char));

          i++;
          this.scrollToBottom();

          // 랜덤 딜레이로 기계적인 느낌 탈피
          const randomSpeed = speed + (Math.random() * 20 - 10);
          setTimeout(typeChar, randomSpeed);
        } else {
          this.isTyping = false;
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

  // 선택지 표시 (버튼 + 텍스트 입력 지원, 순차 등장)
  showChoices(choices) {
    return new Promise(async (resolve) => {
      this.choiceArea.innerHTML = "";
      this.choiceArea.classList.remove("hidden");

      // 1. 선택지 버튼을 순차적으로 타이핑하며 렌더링
      for (let index = 0; index < choices.length; index++) {
        const choice = choices[index];
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        
        // 점령 스타일 (빨간색, 큰 폰트)
        if (choice.style === "conquer") {
          btn.style.cssText = `
            color: #ff3333 !important;
            border-color: #ff3333 !important;
            font-size: 1.3em !important;
            font-weight: bold !important;
            text-shadow: 0 0 10px #ff0000 !important;
            animation: pulse-red 0.5s infinite alternate !important;
            padding: 10px !important;
            margin-bottom: 5px !important;
          `;
        }
        
        const displayIndex = index + 1;
        const fullText = `[${displayIndex}] ${choice.text}`;
        btn.textContent = ""; // 빈 상태로 시작
        
        btn.onclick = () => {
          this.finalizeChoice(choice, resolve);
        };
        this.choiceArea.appendChild(btn);
        
        // 타이핑 효과 (보이는 상태에서 타이핑)
        await this.typeInElement(btn, fullText, 15);
        
        this.scrollToBottom();
      }

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
    // limitLines 제거 - 메시지 축적 유지

    resolve(choice.value);
  }

  // 시스템 메시지 (즉시 출력)
  /**
   * 시스템 메시지 출력 (타이핑 효과)
   * @param {string} text 출력할 텍스트
   * @param {number} speed 타이핑 속도 (ms, 기본값 25)
   * @returns {Promise} 타이핑 완료 시 resolve
   */
  printSystemMessage(text, speed = 25) {
    return new Promise(resolve => {
      const line = document.createElement("div");
      line.className = "terminal-line system-msg";
      line.textContent = "[SYSTEM] ";
      this.contentDiv.appendChild(line);
      // limitLines 제거 - 메시지 축적 유지
      this.scrollToBottom();

      let i = 0;
      const fullText = text;
      const typeChar = () => {
        if (i < fullText.length) {
          line.textContent = `[SYSTEM] ${fullText.substring(0, i + 1)}`;
          i++;
          this.scrollToBottom();
          setTimeout(typeChar, speed);
        } else {
          resolve();
        }
      };
      typeChar();
    });
  }

  // 요소 내에 타이핑 효과
  typeInElement(element, text, speed = 30) {
    return new Promise(resolve => {
      let i = 0;
      const typeChar = () => {
        if (i < text.length) {
          element.textContent = text.substring(0, i + 1);
          i++;
          setTimeout(typeChar, speed);
        } else {
          resolve();
        }
      };
      typeChar();
    });
  }

  // 터미널 라인을 최대 N줄로 제한
  limitLines(maxLines) {
    const lines = this.contentDiv.querySelectorAll(".terminal-line");
    while (lines.length > maxLines) {
      const firstLine = this.contentDiv.querySelector(".terminal-line");
      if (firstLine) firstLine.remove();
      else break;
    }
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
  
  // DATA 표시 업데이트
  updateData(amount) {
    if (this.dataDisplay) {
      this.dataDisplay.innerText = `DATA: ${amount} MB`;
    }
  }
  
  // PAGE 표시 업데이트
  updatePage(text, color = "#00ff00") {
    if (this.pageDisplay) {
      this.pageDisplay.innerText = text;
      this.pageDisplay.style.color = color;
      this.pageDisplay.style.textShadow = `0 0 5px ${color}`;
    }
    if (this.pageSkipBtn) {
      const show = typeof text === "string" && text.startsWith("PAGE:");
      this.pageSkipBtn.style.display = show ? "inline-block" : "none";
    }
  }

  clear() {
    this.contentDiv.innerHTML = "";
  }

  hide() {
    console.log("[DEBUG TerminalUI] hide() 호출됨");
    this.terminalLayer.style.display = "none";
  }

  show() {
    console.log("[DEBUG TerminalUI] show() 호출됨");
    console.log("[DEBUG TerminalUI] terminalLayer before:", this.terminalLayer?.style?.display);
    this.terminalLayer.style.display = "block";
    console.log("[DEBUG TerminalUI] terminalLayer after:", this.terminalLayer?.style?.display);
  }

  setTransparentMode(enabled) {
    console.log("[DEBUG TerminalUI] setTransparentMode(" + enabled + ") 호출됨");
    if (enabled) {
      this.terminalLayer.style.background = "rgba(0,0,0,0)";
      this.terminalLayer.style.pointerEvents = "none";
      // 게임 중에는 텍스트 그림자 더 강하게
      this.terminalLayer.style.textShadow =
        "0 0 3px #000, 0 0 5px var(--term-color)";

      // 게임 중에는 입력창 확실히 숨김 및 포커스 해제
      this.inputLine.classList.add("hidden");
      this.cmdInput.blur();
    } else {
      this.terminalLayer.style.background = "rgba(0, 0, 0, 0.95)"; // 기본은 진하게
      this.terminalLayer.style.pointerEvents = "auto";
      this.terminalLayer.style.textShadow = "0 0 5px var(--term-color)";
    }
    console.log("[DEBUG TerminalUI] background after:", this.terminalLayer?.style?.background);
  }

  // 디펜스 모드용 (배경은 투명하게, 하지만 UI 클릭은 가능하게)
  setDefenseMode(enabled) {
    console.log("[DEBUG TerminalUI] setDefenseMode(" + enabled + ") 호출됨");
    if (enabled) {
        this.terminalLayer.style.background = "rgba(0, 0, 0, 0)"; // 완전 투명
        this.terminalLayer.style.pointerEvents = "none"; // 배경은 클릭 통과 (캔버스 터치 가능)
        this.terminalLayer.style.textShadow = "0 0 2px #000, 0 0 5px var(--term-color)";
        // 선택지와 입력창은 CSS에서 pointer-events: auto로 설정됨
    } else {
        // 비활성화 시 기본 터미널 모드로 복귀
        this.setTransparentMode(false);
    }
    console.log("[DEBUG TerminalUI] after setDefenseMode - background:", this.terminalLayer?.style?.background);
    console.log("[DEBUG TerminalUI] after setDefenseMode - pointerEvents:", this.terminalLayer?.style?.pointerEvents);
  }
}
