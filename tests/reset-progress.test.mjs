import assert from "node:assert/strict";
import test from "node:test";

import { applyPersistenceMixin } from "../js/modules/persist/PersistenceMixin.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.store = new Map(Object.entries(entries));
  }

  clear() {
    this.store.clear();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }
}

test("resetProgressState clears progress but marks tutorial for replay", () => {
  class TestGameManager {}
  applyPersistenceMixin(TestGameManager);

  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = new MemoryStorage({
    tutorial_completed: "true",
    cylinderTetris_money: "500",
  });

  try {
    let stageResetCalled = false;
    const manager = new TestGameManager();
    manager.stageManager = {
      reset() {
        stageResetCalled = true;
      },
    };
    manager.conquestManager = {
      conqueredStages: 2,
      mergedStacks: 1,
      alliedVirusLevel: 3,
      miningRate: 25,
    };
    manager.miningManager = {
      territories: { 1: true },
      cabinet: { storedData: 200 },
    };
    manager.currentMoney = 500;
    manager.reputation = 3;

    manager.resetProgressState();

    assert.equal(globalThis.localStorage.getItem("tutorial_completed"), "false");
    assert.equal(globalThis.localStorage.getItem("cylinderTetris_money"), null);
    assert.equal(stageResetCalled, true);
    assert.equal(manager.conquestManager.conqueredStages, 0);
    assert.equal(manager.conquestManager.mergedStacks, 0);
    assert.equal(manager.conquestManager.alliedVirusLevel, 1);
    assert.equal(manager.conquestManager.miningRate, 0);
    assert.deepEqual(manager.miningManager.territories, {});
    assert.equal(manager.miningManager.cabinet.storedData, 0);
    assert.equal(manager.currentMoney, 0);
    assert.equal(manager.reputation, 0);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});
