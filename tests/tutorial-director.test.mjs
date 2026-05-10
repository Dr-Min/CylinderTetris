import assert from "node:assert/strict";
import test from "node:test";

import { TutorialDirector } from "../js/modules/tutorial/TutorialDirector.js";

test("resolveTargetRect accepts DOM elements from target resolvers", () => {
  const expectedRect = { left: 10, top: 20, width: 120, height: 40 };
  const element = {
    getBoundingClientRect() {
      return expectedRect;
    },
  };
  const director = Object.create(TutorialDirector.prototype);
  director.currentTargetResolver = () => element;

  assert.deepEqual(director.resolveTargetRect(), {
    ...expectedRect,
    right: 130,
    bottom: 60,
  });
});

test("chooseCardPosition falls below mobile map targets when side placement would overlap", () => {
  const director = Object.create(TutorialDirector.prototype);

  const result = director.chooseCardPosition({
    targetRect: { left: 35, top: 450, right: 135, bottom: 530, width: 100, height: 80 },
    cardRect: { width: 326, height: 186 },
    viewportWidth: 390,
    viewportHeight: 844,
    preferredPlacement: "right",
    avoidRect: null,
    margin: 18,
  });

  assert.equal(result.placement, "bottom");
  assert.ok(result.top >= 548);
});

test("chooseCardPosition avoids the command choice area", () => {
  const director = Object.create(TutorialDirector.prototype);

  const result = director.chooseCardPosition({
    targetRect: { left: 8, top: 96, right: 382, bottom: 123, width: 374, height: 27 },
    avoidRect: { left: 8, top: 69, right: 382, bottom: 177, width: 374, height: 108 },
    cardRect: { width: 326, height: 169 },
    viewportWidth: 390,
    viewportHeight: 844,
    preferredPlacement: "bottom",
    margin: 18,
  });

  assert.ok(result.top >= 195);
});

test("conquer hint targets the terminal conquer choice before legacy button", () => {
  let capturedConfig = null;
  const choiceElement = {
    getBoundingClientRect() {
      return { left: 1, top: 2, width: 3, height: 4 };
    },
  };

  const director = Object.create(TutorialDirector.prototype);
  director.showHint = (config) => {
    capturedConfig = config;
  };
  director.findChoiceButton = (value) => (value === "conquer" ? choiceElement : null);
  director.getElementRect = (selector) => {
    throw new Error(`unexpected legacy target: ${selector}`);
  };

  director.showConquerHint();

  assert.equal(capturedConfig.target(), choiceElement);
});

test("combat-ready recovers tutorial flow after a conquest stage is entered", async () => {
  const director = Object.create(TutorialDirector.prototype);
  const calls = [];
  director.completed = false;
  director.sessionActive = true;
  director.phase = "await-stage-select";
  director.isActive = () => true;
  director.showCombatBriefing = async () => {
    calls.push("briefing");
  };
  director.showSurvivalHint = () => {
    calls.push("survival");
  };

  await director.handleEvent("combat-ready", {
    stage: { type: "conquest" },
  });

  assert.deepEqual(calls, ["briefing", "survival"]);
  assert.equal(director.phase, "await-breach-ready");
});

test("command menu re-highlights conquer when the red terminal choice is present", async () => {
  const director = Object.create(TutorialDirector.prototype);
  let conquerHintShown = false;
  director.completed = false;
  director.sessionActive = true;
  director.phase = "await-breach-ready";
  director.isActive = () => true;
  director.showConquerHint = () => {
    conquerHintShown = true;
  };

  await director.handleEvent("command-menu-shown", {
    choices: [{ value: "upgrade" }, { value: "conquer" }],
  });

  assert.equal(conquerHintShown, true);
  assert.equal(director.phase, "await-breach-start");
});
