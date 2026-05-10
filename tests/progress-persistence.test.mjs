import assert from "node:assert/strict";
import test from "node:test";

import { ConquestManager } from "../js/modules/ConquestManager.js";
import { StageManager } from "../js/modules/StageManager.js";
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

  removeItem(key) {
    this.store.delete(key);
  }
}

function withStorage(entries, fn) {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = new MemoryStorage(entries);

  try {
    return fn(globalThis.localStorage);
  } finally {
    globalThis.localStorage = previousStorage;
  }
}

test("StageManager preserves saved current stage and conquered state", () => {
  withStorage(
    {
      stage_state: JSON.stringify({
        currentStageId: 2,
        conqueredStages: [0, 1, 2],
        visitedStages: [3],
      }),
    },
    (storage) => {
      const manager = new StageManager();

      assert.equal(manager.currentStageId, 2);
      assert.equal(manager.getStage(1).conquered, true);
      assert.equal(manager.getStage(2).conquered, true);
      assert.equal(manager.getStage(3).visited, true);
      assert.equal(JSON.parse(storage.getItem("stage_state")).currentStageId, 2);
    }
  );
});

test("ConquestManager sanitizes legacy data and resets to numeric defaults", () => {
  const manager = new ConquestManager();

  manager.loadData({
    conqueredStages: [1, 2],
    mergedStacks: "invalid",
    alliedVirusLevel: 0,
  });

  assert.equal(manager.conqueredStages, 0);
  assert.equal(manager.mergedStacks, 1);
  assert.equal(manager.alliedVirusLevel, 2);
  assert.equal(manager.miningRate, 22);

  manager.reset();

  assert.deepEqual(manager.saveData(), {
    conqueredStages: 0,
    mergedStacks: 0,
    alliedVirusLevel: 1,
  });
  assert.equal(manager.miningRate, 0);
});

test("PersistenceMixin saves, loads, and migrates conquest progress", () => {
  class TestGameManager {}
  applyPersistenceMixin(TestGameManager);

  withStorage({}, (storage) => {
    const manager = new TestGameManager();
    manager.conquestManager = new ConquestManager();
    manager.stageManager = {
      getConqueredCount() {
        return 2;
      },
    };

    manager.loadConquestData();
    assert.deepEqual(manager.conquestManager.saveData(), {
      conqueredStages: 0,
      mergedStacks: 1,
      alliedVirusLevel: 2,
    });
    assert.deepEqual(JSON.parse(storage.getItem("cylinderTetris_conquest")), {
      conqueredStages: 0,
      mergedStacks: 1,
      alliedVirusLevel: 2,
    });

    manager.conquestManager.conqueredStages = 1;
    manager.conquestManager.mergedStacks = 3;
    manager.conquestManager.alliedVirusLevel = 4;
    manager.saveConquestData();

    const restored = new TestGameManager();
    restored.conquestManager = new ConquestManager();
    restored.loadConquestData();

    assert.deepEqual(restored.conquestManager.saveData(), {
      conqueredStages: 1,
      mergedStacks: 3,
      alliedVirusLevel: 4,
    });
  });
});
