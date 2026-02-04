// ===== Global Debug Logging System =====
window.DEBUG_LOG_ENABLED = false; // Master debug ON/OFF

// Per-category debug flags
window.DEBUG_CATEGORIES = {
  Defense: false,      // Defense game general
  AllyMovement: false, // Ally virus movement
  Synergy: false,      // Synergy effects
  Enemy: false,        // Enemy spawn/AI
  GameManager: false,  // Game manager
  TerminalUI: false,   // Terminal UI
  Item: false,         // Item drop/collect
  Combat: false,       // Combat damage calc
  Conquest: false,     // Conquest mode debug
  Canvas: false,       // Canvas display debug
  Tetris: false,       // Tetris game logic
  Helper: false,       // Helper fire/action
  SafeZone: false,     // SafeZone related
  Recall: false,       // Recall feature
  Boss: false,         // Boss combat
  Mining: false,       // Mining system
};

window.debugLog = function (tag, ...args) {
  if (!window.DEBUG_LOG_ENABLED) return;

  // Check category (undefined categories default to false)
  const categoryEnabled = window.DEBUG_CATEGORIES[tag] ?? false;
  if (categoryEnabled) {
    console.log(`[${tag}]`, ...args);
  }
};

window.debugWarn = function (tag, ...args) {
  if (!window.DEBUG_LOG_ENABLED) return;

  const categoryEnabled = window.DEBUG_CATEGORIES[tag] ?? false;
  if (categoryEnabled) {
    console.warn(`[${tag}]`, ...args);
  }
};

// Errors always output (regardless of debug mode)
window.debugError = function (tag, ...args) {
  console.error(`[${tag}]`, ...args);
};

// Debug toggle helper functions (for console use)
window.enableDebug = function () {
  window.DEBUG_LOG_ENABLED = true;
  console.log("✅ Debug logs enabled");
  console.log("Active categories:", Object.keys(window.DEBUG_CATEGORIES).filter(k => window.DEBUG_CATEGORIES[k]));
};

window.disableDebug = function () {
  window.DEBUG_LOG_ENABLED = false;
  console.log("❌ Debug logs disabled");
};

window.toggleDebugCategory = function (category, enabled) {
  if (window.DEBUG_CATEGORIES.hasOwnProperty(category)) {
    window.DEBUG_CATEGORIES[category] = enabled;
    console.log(`${enabled ? '✅' : '❌'} [${category}] debug log ${enabled ? 'enabled' : 'disabled'}`);
  } else {
    console.log(`❌ Category '${category}' not found. Available categories:`, Object.keys(window.DEBUG_CATEGORIES));
  }
};

window.showDebugCategories = function () {
  console.log("=== Debug Category List ===");
  console.log("Master debug:", window.DEBUG_LOG_ENABLED ? "✅ ON" : "❌ OFF");
  console.log("\nPer-category status:");
  Object.keys(window.DEBUG_CATEGORIES).forEach(cat => {
    const status = window.DEBUG_CATEGORIES[cat] ? "✅ ON" : "❌ OFF";
    console.log(`  ${cat}: ${status}`);
  });
  console.log("\nUsage:");
  console.log("  enableDebug() - Enable all debug");
  console.log("  disableDebug() - Disable all debug");
  console.log("  toggleDebugCategory('Conquest', true) - Enable specific category");
  console.log("  toggleDebugCategory('Canvas', false) - Disable specific category");
};
