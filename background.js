/**
 * Clawchi Extension — Background Service Worker
 * Manages pet state, persists to storage, and handles messages.
 * Handles Desktop Mode content script registration.
 *
 * States:
 *   idle       — Agent is not doing anything
 *   thinking   — Agent is processing/reasoning
 *   working    — Agent is executing a task
 *   sleeping   — Agent is inactive/paused
 *   error      — Something went wrong
 *   celebrating — Task completed successfully
 *   needs-input — Agent needs user attention
 */

const DEFAULT_STATE = {
  state: "idle",
  message: "",
  since: Date.now(),
};

const CONTENT_SCRIPT_ID = "clawchi-overlay";

// ══════════════════════════════════════════════════
//  CRAB POSITION SYNC (shared across tabs)
// ══════════════════════════════════════════════════
let crabPosition = { walkX: 0, walkDir: -1, isWalkIdle: false };

// ══════════════════════════════════════════════════
//  CLAWCHI ID (unique per install, used for relay)
// ══════════════════════════════════════════════════
function generateClawchiId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "clawchi_";
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function ensureClawchiId() {
  const data = await chrome.storage.local.get(["clawchiId"]);
  if (!data.clawchiId) {
    const id = generateClawchiId();
    await chrome.storage.local.set({ clawchiId: id });
    return id;
  }
  return data.clawchiId;
}

// Generate ID on install
ensureClawchiId();

// ══════════════════════════════════════════════════
//  CONTENT SCRIPT REGISTRATION
// ══════════════════════════════════════════════════

async function registerContentScript() {
  try {
    // Unregister first to avoid duplicates
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] }).catch(() => {});
    await chrome.scripting.registerContentScripts([{
      id: CONTENT_SCRIPT_ID,
      matches: ["<all_urls>"],
      js: ["content.js"],
      runAt: "document_idle",
      allFrames: false,
    }]);
    console.log("Clawchi content script registered");
  } catch (e) {
    console.error("Failed to register content script:", e);
  }
}

async function unregisterContentScript() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    console.log("Clawchi content script unregistered");
    // Remove crab from all tabs
    broadcastToContentScripts({ type: "CLAWCHI_REMOVE" });
  } catch (e) {
    // Script may not have been registered
  }
}

// Broadcast a message to all tabs' content scripts
async function broadcastToContentScripts(message) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (e) {
    // tabs permission may not be available
  }
}

// On startup, check if Desktop Mode was enabled and re-register
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(["desktopMode"]);
  if (data.desktopMode) {
    const hasPermission = await chrome.permissions.contains({
      permissions: ["scripting"],
      origins: ["<all_urls>"]
    });
    if (hasPermission) {
      await registerContentScript();
    }
  }
});

// Initialize state on install
chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.get(["installDate", "desktopMode"], async (data) => {
    const updates = { petState: DEFAULT_STATE, accessories: [] };
    if (!data.installDate) {
      updates.installDate = Date.now();
    }
    chrome.storage.local.set(updates);

    // Re-register content script if Desktop Mode was enabled
    if (data.desktopMode) {
      const hasPermission = await chrome.permissions.contains({
        permissions: ["scripting"],
        origins: ["<all_urls>"]
      });
      if (hasPermission) {
        await registerContentScript();
      }
    }
  });
});

// ══════════════════════════════════════════════════
//  MESSAGE HANDLING
// ══════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATE") {
    chrome.storage.local.get(["petState", "accessories", "petName", "xp", "siteEffects", "crabColor", "relaySubAgents", "subAgentsEnabled"], (data) => {
      const saEnabled = data.subAgentsEnabled !== false;
      sendResponse({
        petState: data.petState || DEFAULT_STATE,
        accessories: data.accessories || [],
        petName: data.petName || "",
        xp: data.xp || 0,
        siteEffects: data.siteEffects || {},
        crabColor: data.crabColor || 0,
        subAgents: saEnabled ? (data.relaySubAgents || []) : [],
        subAgentsEnabled: saEnabled,
      });
    });
    return true; // async response
  }

  if (msg.type === "SET_STATE") {
    const petState = {
      state: msg.state || "idle",
      message: msg.message || "",
      since: Date.now(),
    };
    chrome.storage.local.set({ petState }, () => {
      // Notify popup if open
      chrome.runtime.sendMessage({ type: "STATE_CHANGED", petState }).catch(() => {});
      // Notify all content scripts
      broadcastToContentScripts({ type: "CLAWCHI_STATE", petState });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "SET_ACCESSORIES") {
    chrome.storage.local.set({ accessories: msg.accessories || [] }, () => {
      chrome.runtime.sendMessage({ type: "ACCESSORIES_CHANGED", accessories: msg.accessories }).catch(() => {});
      // Notify all content scripts
      broadcastToContentScripts({ type: "CLAWCHI_ACCESSORIES", accessories: msg.accessories });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "OPEN_SIDE_PANEL") {
    // Get the current window since popup sender has no tab
    chrome.windows.getCurrent({}, (win) => {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "OPEN_WINDOW") {
    chrome.windows.create({
      url: "popup.html?mode=window",
      type: "popup",
      width: 380,
      height: 560,
    });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "TOGGLE_ACCESSORY") {
    chrome.storage.local.get(["accessories"], (data) => {
      const current = data.accessories || [];
      const id = msg.accessoryId;
      let updated;
      if (current.includes(id)) {
        updated = current.filter((a) => a !== id);
      } else {
        updated = [...current, id];
      }
      chrome.storage.local.set({ accessories: updated }, () => {
        chrome.runtime.sendMessage({ type: "ACCESSORIES_CHANGED", accessories: updated }).catch(() => {});
        broadcastToContentScripts({ type: "CLAWCHI_ACCESSORIES", accessories: updated });
        sendResponse({ ok: true, accessories: updated });
      });
    });
    return true;
  }

  // Desktop Mode ON
  if (msg.type === "DESKTOP_MODE_ON") {
    registerContentScript().then(() => {
      // Inject into currently open tabs immediately
      injectIntoExistingTabs();
      sendResponse({ ok: true });
    });
    return true;
  }

  // Desktop Mode OFF
  if (msg.type === "DESKTOP_MODE_OFF") {
    unregisterContentScript().then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // Site effects changed
  if (msg.type === "SITE_EFFECTS_CHANGED") {
    broadcastToContentScripts({ type: "CLAWCHI_SITE_EFFECTS", siteEffects: msg.siteEffects });
    sendResponse({ ok: true });
    return true;
  }

  // Content script interaction (pet click from overlay)
  if (msg.type === "CLAWCHI_PET_CLICK") {
    chrome.storage.local.get(["happiness", "xp"], (data) => {
      const happiness = Math.min(100, (data.happiness ?? 100) + 3);
      const xp = (data.xp || 0) + 1;
      chrome.storage.local.set({ happiness, xp }, () => {
        // Notify popup
        chrome.runtime.sendMessage({ type: "STATS_UPDATED", happiness, xp }).catch(() => {});
        sendResponse({ ok: true, happiness, xp });
      });
    });
    return true;
  }

  // Sub-agent color changed from popup
  if (msg.type === "SET_SUB_AGENT_COLOR") {
    chrome.storage.local.get(["subAgentColors", "relaySubAgents"], (data) => {
      const colors = data.subAgentColors || {};
      colors[msg.agentId] = msg.color;
      chrome.storage.local.set({ subAgentColors: colors });
      const agents = (data.relaySubAgents || []).map(a =>
        a.id === msg.agentId ? { ...a, color: msg.color } : a
      );
      chrome.storage.local.set({ relaySubAgents: agents });
      broadcastToContentScripts({ type: "CLAWCHI_SUB_AGENTS", subAgents: agents });
      sendResponse({ ok: true });
    });
    return true;
  }

  // Sub-agents toggle from settings
  if (msg.type === "SET_SUB_AGENTS_ENABLED") {
    chrome.storage.local.set({ subAgentsEnabled: msg.enabled });
    if (!msg.enabled) {
      broadcastToContentScripts({ type: "CLAWCHI_SUB_AGENTS", subAgents: [] });
    } else {
      chrome.storage.local.get(["relaySubAgents"], (data) => {
        broadcastToContentScripts({ type: "CLAWCHI_SUB_AGENTS", subAgents: data.relaySubAgents || [] });
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  // Crab color changed in popup — relay to content scripts
  if (msg.type === "SET_CRAB_COLOR") {
    chrome.storage.local.set({ crabColor: msg.crabColor }, () => {
      broadcastToContentScripts({ type: "CLAWCHI_COLOR", crabColor: msg.crabColor });
      sendResponse({ ok: true });
    });
    return true;
  }

  // Pet name changed in popup — relay to content scripts
  if (msg.type === "SET_PET_NAME") {
    chrome.storage.local.set({ petName: msg.petName }, () => {
      broadcastToContentScripts({ type: "CLAWCHI_NAME", petName: msg.petName });
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── Crab Position Sync (tab handoff) ──
  if (msg.type === "SET_CRAB_POSITION") {
    if (msg.position) {
      crabPosition = {
        walkX: msg.position.walkX ?? crabPosition.walkX,
        walkDir: msg.position.walkDir ?? crabPosition.walkDir,
        isWalkIdle: msg.position.isWalkIdle ?? crabPosition.isWalkIdle,
      };
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "GET_CRAB_POSITION") {
    sendResponse({ position: crabPosition });
    return true;
  }

  // ── Clawchi ID (for relay/agent link) ──
  if (msg.type === "GET_CLAWCHI_ID") {
    ensureClawchiId().then(id => {
      sendResponse({ clawchiId: id, extensionId: chrome.runtime.id });
    });
    return true;
  }

  if (msg.type === "REGENERATE_CLAWCHI_ID") {
    const newId = generateClawchiId();
    chrome.storage.local.set({ clawchiId: newId }, () => {
      sendResponse({ clawchiId: newId });
    });
    return true;
  }
});

// Inject content script into all currently open tabs
async function injectIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("about:")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error("Failed to inject into existing tabs:", e);
  }
}

// Handle external messages (from web pages or other extensions)
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SET_AGENT_STATE") {
    const petState = {
      state: msg.state || "idle",
      message: msg.message || "",
      since: Date.now(),
    };
    chrome.storage.local.set({ petState }, () => {
      chrome.runtime.sendMessage({ type: "STATE_CHANGED", petState }).catch(() => {});
      broadcastToContentScripts({ type: "CLAWCHI_STATE", petState });
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Listen for storage changes to relay state updates to content scripts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  // When XP changes (from popup XP ticks), relay to content scripts
  if (changes.xp) {
    broadcastToContentScripts({ type: "CLAWCHI_XP", xp: changes.xp.newValue });
  }
});

// ══════════════════════════════════════════════════
//  RELAY POLLING (polls centralized Clawchi relay)
// ══════════════════════════════════════════════════
let RELAY_BASE = "";  // loaded from storage — users set their own relay URL
let relayPollTimer = null;
let lastRelayTs = 0;

// Load relay URL from storage on startup
chrome.storage.local.get(["relayUrl"], (d) => {
  if (d.relayUrl) RELAY_BASE = d.relayUrl;
});
// Keep it in sync if user changes it
chrome.storage.onChanged.addListener((changes) => {
  if (changes.relayUrl) RELAY_BASE = changes.relayUrl.newValue || "";
});

function startRelayPoll() {
  stopRelayPoll();
  relayPollTimer = setInterval(pollRelay, 1500);
  pollRelay();
}

function stopRelayPoll() {
  if (relayPollTimer) { clearInterval(relayPollTimer); relayPollTimer = null; }
}

const DEFAULT_AGENT_COLORS = [210, 120, 270, 25, 330, 175, 50, 0];

async function pollRelay() {
  try {
    const data = await chrome.storage.local.get(["relayEnabled", "clawchiId", "subAgentsEnabled", "subAgentColors", "relayUrl"]);
    if (!data.relayEnabled || !data.clawchiId || !RELAY_BASE) return;

    const resp = await fetch(`${RELAY_BASE}/state/${data.clawchiId}`);
    if (!resp.ok) return;

    const remote = await resp.json();
    if (!remote.state || remote.ts <= lastRelayTs) return;

    lastRelayTs = remote.ts;

    // Safety cap: discard overly long messages (AI dumped its response)
    let message = String(remote.message || "");
    if (message.length > 50) message = "";

    const petState = {
      state: remote.state,
      message,
      since: Date.now(),
    };
    chrome.storage.local.set({ petState }, () => {
      chrome.runtime.sendMessage({ type: "STATE_CHANGED", petState }).catch(() => {});
      broadcastToContentScripts({ type: "CLAWCHI_STATE", petState });
    });

    // Sub-agents from relay
    const saEnabled = data.subAgentsEnabled !== false;
    const colorMap = data.subAgentColors || {};

    if (saEnabled && Array.isArray(remote.subAgents) && remote.subAgents.length > 0) {
      const relaySubAgents = remote.subAgents.map((sa, i) => ({
        id: sa.id,
        name: sa.name || sa.id,
        color: colorMap[sa.id] ?? DEFAULT_AGENT_COLORS[i % DEFAULT_AGENT_COLORS.length],
        enabled: true,
        state: sa.state || "working",
        message: sa.message || "",
      }));
      chrome.storage.local.set({ relaySubAgents });
      broadcastToContentScripts({ type: "CLAWCHI_SUB_AGENTS", subAgents: relaySubAgents });
      chrome.runtime.sendMessage({ type: "RELAY_SUB_AGENTS_CHANGED", subAgents: relaySubAgents }).catch(() => {});
    } else if (saEnabled) {
      // No sub-agents reported — clear them
      chrome.storage.local.get(["relaySubAgents"], (prev) => {
        if (prev.relaySubAgents && prev.relaySubAgents.length > 0) {
          chrome.storage.local.set({ relaySubAgents: [] });
          broadcastToContentScripts({ type: "CLAWCHI_SUB_AGENTS", subAgents: [] });
          chrome.runtime.sendMessage({ type: "RELAY_SUB_AGENTS_CHANGED", subAgents: [] }).catch(() => {});
        }
      });
    }
  } catch (e) {
    // Relay offline — silently ignore
  }
}

// Start polling on startup if enabled
chrome.storage.local.get(["relayEnabled"], (data) => {
  if (data.relayEnabled) startRelayPoll();
});

// Listen for relay toggle
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;
  if (changes.relayEnabled) {
    if (changes.relayEnabled.newValue) {
      startRelayPoll();
    } else {
      stopRelayPoll();
    }
  }
});
