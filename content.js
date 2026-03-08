/**
 * Clawchi Extension — Content Script
 * Injects a pixel-art crab overlay onto web pages via Shadow DOM.
 * The crab sits at the bottom-right, walks left-right, idles,
 * falls asleep after 3 minutes, and wakes up on click/drag.
 */

(function() {
  "use strict";

  // Prevent double-injection
  if (document.getElementById("clawchi-host")) return;

  // ── Constants ──
  const CRAB_SIZE = 140;        // px width of the crab SVG on page
  const BOTTOM_OFFSET = 0;      // px from bottom edge (sits right on top of taskbar)
  const WALK_SPEED = 1.0;       // px per 50ms tick (faster for visibility)
  const WALK_RIGHT_MAX = 80;    // max px to the right of start
  const WALK_LEFT_MAX = -250;   // max px to the left of start
  const DIR_CHANGE_MIN = 3000;  // ms min between direction changes
  const DIR_CHANGE_MAX = 6000;  // ms max between direction changes
  const IDLE_TOGGLE_MIN = 4000; // ms min between walk/idle toggles
  const IDLE_TOGGLE_MAX = 8000; // ms max between walk/idle toggles
  const AUTO_SLEEP_MS = 180000; // 3 minutes before auto-sleep
  const FONT_URL = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

  const FACE_COORDS = new Set([
    "15,18", "16,18", "15,19", "16,19",
    "23,18", "24,18", "23,19", "24,19",
    "18,20", "19,20", "20,20", "21,20",
  ]);

  const LEVEL_XP = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3250];

  // ── State ──
  let spriteData = null;
  let accessoryData = [];
  let equippedIds = [];
  let currentState = "idle";
  let petName = "";
  let currentXP = 0;
  let currentLevel = 1;
  let siteEffects = {};
  let statusText = "";
  let faceGroupRef = null;
  let bodyGroupRef = null;
  let crabColor = 0; // hue-rotate degrees (0 = default red)

  // Walking state (like landing page)
  let walkX = 0;           // current walk offset from right edge
  let walkDir = -1;        // 1 = right, -1 = left
  let isWalkIdle = false;  // true = standing still, false = walking
  let walkTimer = null;
  let dirChangeTimer = null;
  let idleToggleTimer = null;

  // Drag state
  let isDragging = false;
  let wasDragged = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let crabX = 0;
  let crabY = 0;
  let userPositioned = false;

  // Auto-sleep
  let autoSleepTimer = null;
  let isSleepingLocally = false; // local sleep (not from agent state)

  // Sub-agents
  const SUB_AGENT_SIZE = 80;
  const SUB_AGENT_WALK_SPEED = 0.35;
  let subAgentData = []; // from storage: [{id, name, color, enabled}]
  let subAgentEls = {};  // id -> { container, svgEl, nameEl, areaEl }
  let subAgentWalk = {}; // id -> { x, dir, isIdle, walkTimer, idleTimer, dirTimer }

  // ── Shadow DOM Setup ──
  const host = document.createElement("div");
  host.id = "clawchi-host";
  host.style.cssText = "all:initial; position:fixed; z-index:2147483647; pointer-events:none; top:0; left:0; width:100%; height:100%;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  // Inject font
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = FONT_URL;
  shadow.appendChild(fontLink);

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    #clawchi-overlay {
      position: fixed;
      bottom: ${BOTTOM_OFFSET}px;
      right: 80px;
      z-index: 2147483647;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: right 0.05s linear;
    }

    #clawchi-overlay.dragging {
      transition: none;
    }

    #clawchi-overlay.walk-idle {
      transition: right 0.05s linear;
    }

    #clawchi-crab-area {
      pointer-events: auto;
      cursor: grab;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    #clawchi-crab-area:active {
      cursor: grabbing;
    }

    #clawchi-crab-area.dragging {
      animation: none !important;
    }

    /* Walk bob — small bounce while walking */
    #clawchi-crab-area.walk-bob {
      animation: clawchi-walk-bob 0.5s steps(2) infinite;
    }

    @keyframes clawchi-walk-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    /* Idle breathe — gentle breathing when standing still */
    #clawchi-crab-area.idle-breathe {
      animation: clawchi-idle-breathe 3s ease-in-out infinite;
    }

    @keyframes clawchi-idle-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-2px) scale(1.02); }
    }

    /* Sleeping — very slow breathing */
    #clawchi-crab-area.sleeping {
      animation: clawchi-sleep-breathe 4s ease-in-out infinite;
    }

    @keyframes clawchi-sleep-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-1px) scale(1.01); }
    }

    #clawchi-status {
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      color: #000000;
      text-align: center;
      letter-spacing: 1px;
      line-height: 1.6;
      text-shadow:
        1px 1px 0 #ffffff,
        -1px 1px 0 #ffffff,
        1px -1px 0 #ffffff,
        -1px -1px 0 #ffffff,
        0 1px 0 #ffffff,
        0 -1px 0 #ffffff,
        1px 0 0 #ffffff,
        -1px 0 0 #ffffff;
      max-width: 280px;
      margin-bottom: 4px;
      min-height: 18px;
      text-transform: uppercase;
      word-break: break-word;
      pointer-events: none;
    }

    #clawchi-status::after {
      content: "_";
      animation: clawchi-blink 0.8s step-end infinite;
    }

    @keyframes clawchi-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    #clawchi-svg {
      image-rendering: pixelated;
      display: block;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
    }

    /* Happy pet animation */
    @keyframes clawchi-happy {
      0% { transform: translateY(0) rotate(0deg); }
      20% { transform: translateY(-6px) rotate(-5deg); }
      40% { transform: translateY(-3px) rotate(5deg); }
      60% { transform: translateY(-5px) rotate(-3deg); }
      80% { transform: translateY(-2px) rotate(2deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }

    .clawchi-happy-click #clawchi-svg {
      animation: clawchi-happy 0.5s ease;
    }

    /* Annoyed shake animation */
    @keyframes clawchi-annoyed {
      0% { transform: translateX(0); }
      10% { transform: translateX(-4px) rotate(-2deg); }
      20% { transform: translateX(4px) rotate(2deg); }
      30% { transform: translateX(-4px) rotate(-1deg); }
      40% { transform: translateX(4px) rotate(1deg); }
      50% { transform: translateX(-3px); }
      60% { transform: translateX(3px); }
      70% { transform: translateX(-2px); }
      80% { transform: translateX(2px); }
      90% { transform: translateX(-1px); }
      100% { transform: translateX(0); }
    }

    .clawchi-annoyed-click #clawchi-svg {
      animation: clawchi-annoyed 0.6s ease;
    }

    /* Pixel bubbles */
    .clawchi-bubble {
      position: absolute;
      background: rgba(180, 230, 255, 0.4);
      border: 1px solid rgba(200, 240, 255, 0.6);
      border-radius: 0;
      image-rendering: pixelated;
      pointer-events: none;
      animation: clawchi-bubble-rise 2.5s steps(20) forwards;
    }

    @keyframes clawchi-bubble-rise {
      0%   { transform: translateY(0); opacity: 0.8; }
      25%  { transform: translateY(-40px) translateX(3px); opacity: 0.7; }
      50%  { transform: translateY(-80px) translateX(-2px); opacity: 0.5; }
      75%  { transform: translateY(-120px) translateX(4px); opacity: 0.3; }
      100% { transform: translateY(-160px) translateX(-1px); opacity: 0; }
    }

    /* ── Sub-Agents ── */
    .sub-agent {
      position: fixed;
      bottom: 0px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: left 0.05s linear;
    }

    .sub-agent.dragging {
      transition: none;
    }

    .sub-agent-area {
      pointer-events: auto;
      cursor: grab;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .sub-agent-area:active {
      cursor: grabbing;
    }

    .sub-agent-status {
      font-family: 'Press Start 2P', monospace;
      font-size: 6px;
      color: #000000;
      text-align: center;
      letter-spacing: 0.3px;
      text-shadow:
        1px 1px 0 #ffffff, -1px 1px 0 #ffffff,
        1px -1px 0 #ffffff, -1px -1px 0 #ffffff,
        0 1px 0 #ffffff, 0 -1px 0 #ffffff,
        1px 0 0 #ffffff, -1px 0 0 #ffffff;
      max-width: 160px;
      margin-bottom: 2px;
      min-height: 10px;
      text-transform: uppercase;
      word-break: break-word;
      pointer-events: none;
    }

    .sub-agent-area.walk-bob {
      animation: clawchi-walk-bob 0.6s steps(2) infinite;
    }

    .sub-agent-area.idle-breathe {
      animation: clawchi-idle-breathe 3s ease-in-out infinite;
    }

    .sub-agent-svg {
      image-rendering: pixelated;
      display: block;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
    }

    .sub-agent-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #000000;
      text-align: center;
      letter-spacing: 0.5px;
      text-shadow:
        1px 1px 0 #ffffff,
        -1px 1px 0 #ffffff,
        1px -1px 0 #ffffff,
        -1px -1px 0 #ffffff,
        0 1px 0 #ffffff,
        0 -1px 0 #ffffff,
        1px 0 0 #ffffff,
        -1px 0 0 #ffffff;
      margin-top: 2px;
      pointer-events: none;
      text-transform: uppercase;
    }
  `;
  shadow.appendChild(style);

  // ── Overlay DOM ──
  const overlay = document.createElement("div");
  overlay.id = "clawchi-overlay";

  const crabArea = document.createElement("div");
  crabArea.id = "clawchi-crab-area";
  crabArea.className = "idle-breathe";

  const statusEl = document.createElement("div");
  statusEl.id = "clawchi-status";

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgEl.id = "clawchi-svg";
  svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgEl.setAttribute("shape-rendering", "crispEdges");

  crabArea.appendChild(statusEl);
  crabArea.appendChild(svgEl);
  overlay.appendChild(crabArea);
  shadow.appendChild(overlay);

  // ── SVG Rendering ──
  function svgRect(x, y, fill) {
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("x", x - 0.03);
    r.setAttribute("y", y - 0.03);
    r.setAttribute("width", 1.06);
    r.setAttribute("height", 1.06);
    r.setAttribute("fill", fill);
    return r;
  }

  function computeViewBox(pixels, overlays, accPixels) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const update = p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + 1 > maxX) maxX = p.x + 1;
      if (p.y + 1 > maxY) maxY = p.y + 1;
    };
    pixels.forEach(update);
    if (overlays) overlays.forEach(o => o.frames.forEach(f => f.forEach(update)));
    if (accPixels) accPixels.forEach(update);
    return `${minX - 1} ${minY - 1} ${maxX - minX + 2} ${maxY - minY + 2}`;
  }

  function getEquippedPixels() {
    const order = ["back", "shoes", "collar", "glasses", "hat"];
    const pixels = [], byCategory = {};
    for (const acc of accessoryData) {
      if (equippedIds.includes(acc.id)) byCategory[acc.category] = acc;
    }
    for (const cat of order) {
      if (byCategory[cat]) pixels.push(...byCategory[cat].pixels);
    }
    return pixels;
  }

  let overlayTimers = {};

  function clearOverlayTimers() {
    for (const k of Object.keys(overlayTimers)) clearInterval(overlayTimers[k]);
    overlayTimers = {};
  }

  function renderOverlay(overlayDef, parent) {
    if (!overlayDef.frames || !overlayDef.frames.length) return;
    const target = parent || svgEl;
    const groups = overlayDef.frames.map((frame, fi) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.style.display = fi === 0 ? "" : "none";
      for (const p of frame) g.appendChild(svgRect(p.x, p.y, p.color));
      target.appendChild(g);
      return g;
    });
    let frame = 0;
    const interval = setInterval(() => {
      groups[frame].style.display = "none";
      frame = (frame + 1) % groups.length;
      groups[frame].style.display = "";
    }, overlayDef.frameDuration || 500);
    overlayTimers[overlayDef.id] = interval;
  }

  function renderCrab() {
    if (!spriteData) return;

    // Use sleeping sprite if locally sleeping
    let spriteKey = isSleepingLocally ? "sleeping" : currentState;
    if (!spriteData[spriteKey]) spriteKey = "idle";
    const sprite = spriteData[spriteKey];
    if (!sprite) return;

    const accPixels = getEquippedPixels();
    const vb = computeViewBox(sprite.base, sprite.overlays, accPixels);
    const parts = vb.split(" ").map(Number);
    const aspectRatio = parts[3] / parts[2];

    svgEl.setAttribute("viewBox", vb);
    svgEl.setAttribute("width", CRAB_SIZE);
    svgEl.setAttribute("height", Math.round(CRAB_SIZE * aspectRatio));
    svgEl.innerHTML = "";
    clearOverlayTimers();

    // Body group (gets color filter, accessories stay outside)
    const bodyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bodyGroup.id = "crab-body";

    const bodyPixels = [], facePixels = [];
    for (const p of sprite.base) {
      if (FACE_COORDS.has(`${p.x},${p.y}`)) facePixels.push(p);
      else bodyPixels.push(p);
    }

    for (const p of bodyPixels) bodyGroup.appendChild(svgRect(p.x, p.y, p.color));
    for (const p of facePixels) bodyGroup.appendChild(svgRect(p.x, p.y, "#ef233c"));

    const faceGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    faceGroup.id = "clawchi-face";
    for (const p of facePixels) faceGroup.appendChild(svgRect(p.x, p.y, p.color));
    bodyGroup.appendChild(faceGroup);
    faceGroupRef = faceGroup;

    svgEl.appendChild(bodyGroup);
    bodyGroupRef = bodyGroup;

    if (sprite.overlays) {
      for (const o of sprite.overlays) renderOverlay(o, bodyGroup);
    }

    // Accessories go on svgEl directly (outside body group, no color filter)
    for (const p of accPixels) svgEl.appendChild(svgRect(p.x, p.y, p.color));
  }

  // ── Status Text (typewriter) ──
  let typewriterTimer = null;

  function typewrite(text) {
    statusText = text;
    if (typewriterTimer) clearInterval(typewriterTimer);
    statusEl.textContent = "";
    let i = 0;
    typewriterTimer = setInterval(() => {
      if (i < text.length) {
        statusEl.textContent += text[i];
        i++;
      } else {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
      }
    }, 60);
  }

  // ── Walking Engine (matches landing page behavior) ──
  function updateCrabAnimClass() {
    crabArea.classList.remove("walk-bob", "idle-breathe", "sleeping", "dragging");
    if (isSleepingLocally || currentState === "sleeping") {
      crabArea.classList.add("sleeping");
    } else if (isDragging) {
      crabArea.classList.add("dragging");
    } else if (isWalkIdle) {
      crabArea.classList.add("idle-breathe");
    } else {
      crabArea.classList.add("walk-bob");
    }
  }

  function startWalking() {
    if (walkTimer) return;

    // Walk movement tick (50ms interval, same as landing page)
    walkTimer = setInterval(() => {
      if (isDragging || userPositioned || isWalkIdle || isSleepingLocally) return;

      walkX += walkDir * WALK_SPEED;

      // Full-screen walk range
      const maxLeft = -(window.innerWidth - CRAB_SIZE - 10);
      if (walkX > WALK_RIGHT_MAX) {
        walkX = WALK_RIGHT_MAX;
        walkDir = -1;
      } else if (walkX < maxLeft) {
        walkX = maxLeft;
        walkDir = 1;
      }

      overlay.style.right = (80 - walkX) + "px";
    }, 50);

    // Random direction changes
    scheduleDirChange();

    // Walk/idle toggle
    scheduleIdleToggle();
  }

  function scheduleDirChange() {
    if (dirChangeTimer) clearTimeout(dirChangeTimer);
    const delay = DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN);
    dirChangeTimer = setTimeout(() => {
      if (!isWalkIdle && !isSleepingLocally) {
        walkDir = Math.random() > 0.5 ? 1 : -1;
      }
      scheduleDirChange();
    }, delay);
  }

  function scheduleIdleToggle() {
    if (idleToggleTimer) clearTimeout(idleToggleTimer);
    const delay = IDLE_TOGGLE_MIN + Math.random() * (IDLE_TOGGLE_MAX - IDLE_TOGGLE_MIN);
    idleToggleTimer = setTimeout(() => {
      if (isSleepingLocally || isDragging || userPositioned) {
        scheduleIdleToggle();
        return;
      }
      isWalkIdle = !isWalkIdle;
      if (!isWalkIdle) {
        walkDir = Math.random() > 0.5 ? 1 : -1;
      }
      updateCrabAnimClass();
      scheduleIdleToggle();
    }, delay);
  }

  function stopWalking() {
    if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
    if (dirChangeTimer) { clearTimeout(dirChangeTimer); dirChangeTimer = null; }
    if (idleToggleTimer) { clearTimeout(idleToggleTimer); idleToggleTimer = null; }
  }

  // ── Auto-Sleep Timer ──
  function resetAutoSleepTimer() {
    if (autoSleepTimer) clearTimeout(autoSleepTimer);
    autoSleepTimer = setTimeout(() => {
      if (currentState === "idle" && !isSleepingLocally) {
        fallAsleep();
      }
    }, AUTO_SLEEP_MS);
  }

  function fallAsleep() {
    isSleepingLocally = true;
    isWalkIdle = true;
    updateCrabAnimClass();
    renderCrab();
    typewrite("ZZZ...");
    stopIdleMessages();
  }

  function wakeUp() {
    if (!isSleepingLocally) return;
    isSleepingLocally = false;
    isWalkIdle = false;
    updateCrabAnimClass();
    renderCrab();
    typewrite("*YAWNS* ...I'M UP!");
    startIdleMessages();
    resetAutoSleepTimer();
  }

  // ── Drag & Drop ──
  function initDragging() {
    crabArea.addEventListener("mousedown", onDragStart);
    crabArea.addEventListener("touchstart", onTouchStart, { passive: false });

    function onDragStart(e) {
      e.preventDefault();
      isDragging = true;
      wasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      crabArea.classList.add("dragging");
      const rect = overlay.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      isDragging = true;
      wasDragged = false;
      crabArea.classList.add("dragging");
      const touch = e.touches[0];
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;
      const rect = overlay.getBoundingClientRect();
      dragOffsetX = touch.clientX - rect.left;
      dragOffsetY = touch.clientY - rect.top;
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    }

    function onDragMove(e) {
      if (!isDragging) return;
      moveCrab(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      moveCrab(touch.clientX, touch.clientY);
    }

    function moveCrab(clientX, clientY) {
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDragged = true;
      userPositioned = true;
      crabX = clientX - dragOffsetX;
      crabY = clientY - dragOffsetY;

      const w = window.innerWidth;
      const h = window.innerHeight;
      crabX = Math.max(0, Math.min(w - CRAB_SIZE, crabX));
      crabY = Math.max(0, Math.min(h - CRAB_SIZE, crabY));

      overlay.style.bottom = "auto";
      overlay.style.right = "auto";
      overlay.style.left = crabX + "px";
      overlay.style.top = crabY + "px";
      overlay.style.transform = "";
    }

    function onDragEnd() {
      isDragging = false;
      crabArea.classList.remove("dragging");
      updateCrabAnimClass();
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      // Wake up if sleeping and was dragged
      if (isSleepingLocally && wasDragged) wakeUp();
      if (wasDragged) {
        snapOrStay();
      } else {
        userPositioned = false;
      }
      resetAutoSleepTimer();
    }

    function onTouchEnd() {
      isDragging = false;
      crabArea.classList.remove("dragging");
      updateCrabAnimClass();
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      if (isSleepingLocally && wasDragged) wakeUp();
      if (wasDragged) {
        snapOrStay();
      } else {
        userPositioned = false;
      }
      resetAutoSleepTimer();
    }

    // Decide: snap to bottom rail (resume walking) or stay where placed
    function snapOrStay() {
      const h = window.innerHeight;
      const bottomThreshold = 60; // px from very bottom edge
      const crabBottom = h - crabY - CRAB_SIZE;

      if (crabBottom <= bottomThreshold) {
        // Dropped near bottom — snap to bottom rail, resume walking from this X
        // Convert left-based crabX to right-based walkX
        const rightPos = window.innerWidth - crabX - CRAB_SIZE;
        walkX = 80 - rightPos;
        // Clamp to full-screen walk range
        const maxLeft = -(window.innerWidth - CRAB_SIZE - 10);
        walkX = Math.max(maxLeft, Math.min(WALK_RIGHT_MAX, walkX));
        userPositioned = false;
        isWalkIdle = true; // pause walking briefly so crab stays put
        updateCrabAnimClass();
        overlay.style.left = "";
        overlay.style.top = "";
        overlay.style.bottom = BOTTOM_OFFSET + "px";
        overlay.style.right = (80 - walkX) + "px";
        overlay.style.transform = "";
        // Resume walking after a short pause
        setTimeout(() => {
          isWalkIdle = false;
          updateCrabAnimClass();
        }, 2000);
      }
      // Otherwise: userPositioned stays true, crab stays where placed
    }
  }

  // ── Click to Pet (with happy/annoyed reactions) ──
  const HAPPY_RESPONSES = [
    "OH HI FREN!",
    "PINCH PINCH!",
    "THAT TICKLES!",
    "HEHE! AGAIN!",
    "I LOVE PETS!",
    "*HAPPY CRAB NOISES*",
    "YAY! ATTENTION!",
    "U R THE BEST!",
    "CLICKY CLICKY!",
    "SQUEE!",
    "*WIGGLES HAPPILY*",
    "MORE PETS PLS!",
    "BEST. DAY. EVER!",
    "SNAP SNAP!",
    "FEELING THE LOVE!",
  ];
  const ANNOYED_RESPONSES = [
    "STOP POKING ME!",
    "I SAID STOOOOP!",
    "EXCUSE ME?!",
    "GRRRR...",
    "CRAB RAGE MODE!",
    "DO THAT AGAIN. I DARE U.",
    "OUCH! RUDE!",
    "PERSONAL SPACE PLS!",
  ];
  let clickTimestamps = [];
  let lastClickTime = 0;
  let annoyedCooldown = false;
  let lastHappyIdx = -1;
  let lastAnnoyedIdx = -1;

  crabArea.addEventListener("click", (e) => {
    if (wasDragged) return;
    const now = Date.now();
    if (now - lastClickTime < 200) return; // debounce
    lastClickTime = now;

    // Wake up if sleeping
    if (isSleepingLocally) {
      wakeUp();
      return;
    }

    if (annoyedCooldown) return;

    // Track rapid clicks (within 3 seconds)
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 3000);

    if (clickTimestamps.length > 5) {
      // ── Annoyed! ──
      annoyedCooldown = true;
      clickTimestamps = [];
      crabArea.classList.remove("clawchi-happy-click");
      void crabArea.offsetWidth; // force reflow
      crabArea.classList.add("clawchi-annoyed-click");
      setTimeout(() => crabArea.classList.remove("clawchi-annoyed-click"), 650);

      let idx;
      do { idx = Math.floor(Math.random() * ANNOYED_RESPONSES.length); } while (idx === lastAnnoyedIdx && ANNOYED_RESPONSES.length > 1);
      lastAnnoyedIdx = idx;
      typewrite(ANNOYED_RESPONSES[idx]);

      // Cooldown for 2 seconds after annoyed
      setTimeout(() => { annoyedCooldown = false; }, 2000);
    } else {
      // ── Happy! ──
      crabArea.classList.remove("clawchi-happy-click");
      void crabArea.offsetWidth; // force reflow
      crabArea.classList.add("clawchi-happy-click");
      setTimeout(() => crabArea.classList.remove("clawchi-happy-click"), 550);

      let idx;
      do { idx = Math.floor(Math.random() * HAPPY_RESPONSES.length); } while (idx === lastHappyIdx && HAPPY_RESPONSES.length > 1);
      lastHappyIdx = idx;
      typewrite(HAPPY_RESPONSES[idx]);
      spawnBubble();
    }

    chrome.runtime.sendMessage({ type: "CLAWCHI_PET_CLICK" }).catch(() => {});
    resetAutoSleepTimer();
  });

  function spawnBubble() {
    const size = 4 + Math.floor(Math.random() * 6);
    const bubble = document.createElement("div");
    bubble.className = "clawchi-bubble";
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = (CRAB_SIZE / 2 - size / 2 + (Math.random() - 0.5) * 30) + "px";
    bubble.style.bottom = "30px";
    crabArea.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2600);
  }

  // ── Load Sprites ──
  async function loadSprites() {
    try {
      const [idle, sleeping, thinking, working] = await Promise.all([
        fetch(chrome.runtime.getURL("sprites/base-crab.json")).then(r => r.json()),
        fetch(chrome.runtime.getURL("sprites/sleeping.json")).then(r => r.json()),
        fetch(chrome.runtime.getURL("sprites/thinking.json")).then(r => r.json()),
        fetch(chrome.runtime.getURL("sprites/working.json")).then(r => r.json()),
      ]);
      spriteData = { idle, sleeping, thinking, working };
    } catch (e) {
      console.error("Clawchi: Failed to load sprites", e);
    }
  }

  async function loadAccessories() {
    try {
      const names = [
        "top-hat","crown","sunglasses","party-hat","bow-tie","wizard-hat",
        "santa-hat","headphones","backwards-cap","bandana","cigarette",
        "gold-chain","halo","devil-horns","angel-wings","small-shoes",
        "rainbow-skin","money-stacks"
      ];
      accessoryData = await Promise.all(
        names.map(n => fetch(chrome.runtime.getURL(`sprites/accessories/${n}.json`)).then(r => r.json()))
      );
    } catch (e) {
      console.error("Clawchi: Failed to load accessories", e);
    }
  }

  // ── Level Helpers ──
  function getLevelFromXP(xp) {
    for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_XP[i]) return i + 1;
    }
    return 1;
  }

  // ── Idle Messages ──
  const IDLE_MESSAGES = [
    "JUST VIBING...",
    "WHAT'S ON THIS PAGE?",
    "I'M HELPING!",
    "NICE WEBSITE!",
    "*CLICK CLICK*",
    "HI THERE!",
    "BROWSING BUDDY!",
    "I'M A GOOD CRAB!",
    "LOOK AT ME GO!",
    "SNIP SNIP!",
    "WHAT ARE WE DOING?",
    "THIS IS FUN!",
    "CRAB LIFE IS GOOD!",
    "FEELING CRABBY?",
    "SHELL YEAH!",
    "CLAWSOME DAY, HUH?",
    "SEAS THE DAY!",
  ];

  const STATE_MESSAGES = {
    idle: "JUST CHILLIN'...",
    thinking: "HMMMM...",
    working: "BUSY BUSY BUSY!",
    sleeping: "ZZZ...",
    celebrating: "WOOHOO!!!",
    "needs-input": "HEY! LOOK HERE!",
    error: "UH OH...",
  };

  let idleMessageTimer = null;

  function startIdleMessages() {
    if (idleMessageTimer) return;
    typewrite(IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)]);
    idleMessageTimer = setInterval(() => {
      if (currentState === "idle" && !isSleepingLocally) {
        typewrite(IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)]);
      }
    }, 12000 + Math.random() * 8000);
  }

  function stopIdleMessages() {
    if (idleMessageTimer) {
      clearInterval(idleMessageTimer);
      idleMessageTimer = null;
    }
  }

  // ── Message Handling ──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "CLAWCHI_STATE") {
      currentState = msg.petState.state;
      // If agent sets sleeping, override local sleep
      if (currentState === "sleeping") {
        isSleepingLocally = true;
      } else if (isSleepingLocally && currentState !== "sleeping") {
        isSleepingLocally = false;
      }
      renderCrab();
      updateCrabAnimClass();
      stopIdleMessages();
      if (currentState === "sleeping") {
        typewrite("ZZZ...");
        releaseActiveWalker();
      } else if (currentState === "idle" && !isSleepingLocally) {
        startIdleMessages();
        if (document.visibilityState === "visible") becomeActiveWalker();
        resetAutoSleepTimer();
      } else {
        // Non-idle, non-sleeping states: show message but KEEP WALKING
        typewrite(msg.petState.message || STATE_MESSAGES[currentState] || "");
        if (document.visibilityState === "visible") becomeActiveWalker();
        resetAutoSleepTimer();
      }
    }

    if (msg.type === "CLAWCHI_ACCESSORIES") {
      equippedIds = msg.accessories || [];
      renderCrab();
    }

    if (msg.type === "CLAWCHI_NAME") {
      petName = msg.petName || "";
    }

    if (msg.type === "CLAWCHI_SITE_EFFECTS") {
      siteEffects = msg.siteEffects || {};
    }

    if (msg.type === "CLAWCHI_COLOR") {
      crabColor = msg.crabColor || 0;
      applyCrabColor();
    }

    if (msg.type === "CLAWCHI_SUB_AGENTS") {
      subAgentData = msg.subAgents || [];
      syncSubAgents();
    }

    if (msg.type === "CLAWCHI_XP") {
      currentXP = msg.xp || 0;
      currentLevel = getLevelFromXP(currentXP);
    }

    if (msg.type === "CLAWCHI_REMOVE") {
      destroy();
    }
  });

  // ── Cleanup ──
  function destroy() {
    stopWalking();
    stopIdleMessages();
    clearOverlayTimers();
    if (typewriterTimer) clearInterval(typewriterTimer);
    if (autoSleepTimer) clearTimeout(autoSleepTimer);
    if (positionSyncTimer) clearInterval(positionSyncTimer);
    // Cleanup sub-agents
    for (const id of Object.keys(subAgentEls)) removeSubAgentEl(id);
    host.remove();
  }

  // ── Sub-Agent Rendering ──
  function renderSubAgentSVG(svgEl, agent) {
    if (!spriteData || !spriteData.idle) return;
    const sprite = spriteData.idle;
    const vb = computeViewBox(sprite.base, sprite.overlays, []);
    const parts = vb.split(" ").map(Number);
    const aspectRatio = parts[3] / parts[2];

    svgEl.setAttribute("viewBox", vb);
    svgEl.setAttribute("width", SUB_AGENT_SIZE);
    svgEl.setAttribute("height", Math.round(SUB_AGENT_SIZE * aspectRatio));
    svgEl.innerHTML = "";

    const bodyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (agent.color && agent.color !== 0) {
      bodyGroup.style.filter = `hue-rotate(${agent.color}deg)`;
    }
    for (const p of sprite.base) bodyGroup.appendChild(svgRect(p.x, p.y, p.color));
    if (sprite.overlays) {
      for (const o of sprite.overlays) {
        if (o.frames && o.frames.length > 0) {
          for (const p of o.frames[0]) bodyGroup.appendChild(svgRect(p.x, p.y, p.color));
        }
      }
    }
    svgEl.appendChild(bodyGroup);
  }

  function createSubAgentEl(agent) {
    const container = document.createElement("div");
    container.className = "sub-agent";
    container.dataset.agentId = agent.id;

    const area = document.createElement("div");
    area.className = "sub-agent-area idle-breathe";

    const statusEl = document.createElement("div");
    statusEl.className = "sub-agent-status";
    statusEl.textContent = agent.message || "";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "sub-agent-svg";
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("shape-rendering", "crispEdges");
    renderSubAgentSVG(svg, agent);

    const nameEl = document.createElement("div");
    nameEl.className = "sub-agent-name";
    nameEl.textContent = agent.name || "";

    area.appendChild(statusEl);
    area.appendChild(svg);
    container.appendChild(area);
    container.appendChild(nameEl);
    shadow.appendChild(container);

    return { container, svgEl: svg, nameEl, areaEl: area, statusEl };
  }

  function startSubAgentWalk(id) {
    const el = subAgentEls[id];
    if (!el) return;

    const startX = 50 + Math.random() * (window.innerWidth - SUB_AGENT_SIZE - 100);
    const state = {
      x: startX,
      dir: Math.random() > 0.5 ? 1 : -1,
      isIdle: false,
      userPositioned: false,
      walkTimer: null,
      idleTimer: null,
      dirTimer: null,
    };
    subAgentWalk[id] = state;
    el.container.style.left = state.x + "px";

    // Walk tick
    state.walkTimer = setInterval(() => {
      if (state.isIdle || state.userPositioned) return;
      state.x += state.dir * SUB_AGENT_WALK_SPEED;
      const maxX = window.innerWidth - SUB_AGENT_SIZE;
      if (state.x > maxX) { state.x = maxX; state.dir = -1; }
      else if (state.x < 0) { state.x = 0; state.dir = 1; }
      el.container.style.left = state.x + "px";
    }, 50);

    // Direction changes
    function scheduleDir() {
      state.dirTimer = setTimeout(() => {
        if (!state.isIdle) state.dir = Math.random() > 0.5 ? 1 : -1;
        scheduleDir();
      }, 2500 + Math.random() * 3000);
    }
    scheduleDir();

    // Idle toggle
    function scheduleIdle() {
      state.idleTimer = setTimeout(() => {
        state.isIdle = !state.isIdle;
        el.areaEl.classList.remove("walk-bob", "idle-breathe");
        el.areaEl.classList.add(state.isIdle ? "idle-breathe" : "walk-bob");
        if (!state.isIdle) state.dir = Math.random() > 0.5 ? 1 : -1;
        scheduleIdle();
      }, 3000 + Math.random() * 5000);
    }
    scheduleIdle();
  }

  function stopSubAgentWalk(id) {
    const state = subAgentWalk[id];
    if (!state) return;
    if (state.walkTimer) clearInterval(state.walkTimer);
    if (state.idleTimer) clearTimeout(state.idleTimer);
    if (state.dirTimer) clearTimeout(state.dirTimer);
    delete subAgentWalk[id];
  }

  function removeSubAgentEl(id) {
    stopSubAgentWalk(id);
    const el = subAgentEls[id];
    if (el) {
      el.container.remove();
      delete subAgentEls[id];
    }
  }

  // ── Sub-Agent 2D Dragging ──
  function initSubAgentDragging(id) {
    const el = subAgentEls[id];
    if (!el) return;
    const area = el.areaEl;

    let isDragging = false, wasDragged = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let dragStartX = 0, dragStartY = 0;

    area.addEventListener("mousedown", onStart);
    area.addEventListener("touchstart", onTouchStart, { passive: false });

    function onStart(e) {
      e.preventDefault();
      isDragging = true; wasDragged = false;
      dragStartX = e.clientX; dragStartY = e.clientY;
      const rect = el.container.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      el.container.classList.add("dragging");
      area.style.cursor = "grabbing";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      isDragging = true; wasDragged = false;
      const t = e.touches[0];
      dragStartX = t.clientX; dragStartY = t.clientY;
      const rect = el.container.getBoundingClientRect();
      dragOffsetX = t.clientX - rect.left;
      dragOffsetY = t.clientY - rect.top;
      el.container.classList.add("dragging");
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    }

    function onMove(e) { move(e.clientX, e.clientY); }
    function onTouchMove(e) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }

    function move(cx, cy) {
      if (!isDragging) return;
      if (Math.abs(cx - dragStartX) > 5 || Math.abs(cy - dragStartY) > 5) wasDragged = true;
      if (!wasDragged) return;

      const state = subAgentWalk[id];
      if (state) state.userPositioned = true;

      let x = cx - dragOffsetX;
      let y = cy - dragOffsetY;
      x = Math.max(0, Math.min(window.innerWidth - SUB_AGENT_SIZE, x));
      y = Math.max(0, Math.min(window.innerHeight - SUB_AGENT_SIZE, y));

      el.container.style.bottom = "auto";
      el.container.style.left = x + "px";
      el.container.style.top = y + "px";
    }

    function onEnd() {
      isDragging = false;
      el.container.classList.remove("dragging");
      area.style.cursor = "grab";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      if (wasDragged) snapOrStay(id);
    }

    function onTouchEnd() {
      isDragging = false;
      el.container.classList.remove("dragging");
      area.style.cursor = "grab";
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      if (wasDragged) snapOrStay(id);
    }
  }

  function snapOrStay(id) {
    const el = subAgentEls[id];
    const state = subAgentWalk[id];
    if (!el || !state) return;

    const rect = el.container.getBoundingClientRect();
    const bottomThreshold = 60;

    if (rect.bottom >= window.innerHeight - bottomThreshold) {
      // Snap back to bottom rail, resume walking
      state.userPositioned = false;
      state.x = rect.left;
      el.container.style.top = "";
      el.container.style.bottom = "0px";
      el.container.style.left = state.x + "px";
    }
    // Otherwise: stay where placed
  }

  function syncSubAgents() {
    // Get enabled agent IDs (use strings for relay compatibility)
    const enabledIds = new Set(subAgentData.filter(a => a.enabled !== false).map(a => String(a.id)));

    // Remove agents that are no longer present
    for (const id of Object.keys(subAgentEls)) {
      if (!enabledIds.has(String(id))) {
        removeSubAgentEl(id);
      }
    }

    // Add/update agents that should be shown
    for (const agent of subAgentData) {
      if (agent.enabled === false) continue;
      const aid = String(agent.id);

      if (subAgentEls[aid]) {
        // Update existing: re-render SVG, name, and status
        const el = subAgentEls[aid];
        renderSubAgentSVG(el.svgEl, agent);
        el.nameEl.textContent = agent.name || "";
        if (el.statusEl) el.statusEl.textContent = agent.message || "";
      } else {
        // Create new
        subAgentEls[aid] = createSubAgentEl(agent);
        startSubAgentWalk(aid);
        initSubAgentDragging(aid);
      }
    }
  }

  // ── Crab Color ──
  function applyCrabColor() {
    if (!bodyGroupRef) return;
    bodyGroupRef.style.filter = crabColor === 0 ? "" : `hue-rotate(${crabColor}deg)`;
  }

  // ── Mouse Tracking (eyes follow cursor) ──
  function setupMouseTracking() {
    document.addEventListener("mousemove", (e) => {
      if (isSleepingLocally || currentState === "sleeping") {
        // Reset face position when sleeping
        if (faceGroupRef) faceGroupRef.setAttribute("transform", "translate(0,0)");
        return;
      }
      if (!faceGroupRef) return;

      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(1, dist / 200);
      const len = dist || 1;
      const nx = dx / len;
      const ny = dy / len;
      const maxX = 3;
      const maxY = ny > 0 ? 4 : 2.5;

      faceGroupRef.setAttribute(
        "transform",
        `translate(${(nx * maxX * t).toFixed(2)},${(ny * maxY * t).toFixed(2)})`
      );
    });
  }

  // ── Tab Position Sync ──
  // Only the visible tab walks. On tab switch, position is handed off.
  let isActiveWalker = false;
  let positionSyncTimer = null;

  function savePositionToBackground() {
    chrome.runtime.sendMessage({
      type: "SET_CRAB_POSITION",
      position: { walkX, walkDir, isWalkIdle }
    }).catch(() => {});
  }

  async function loadPositionFromBackground() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "GET_CRAB_POSITION" });
      if (resp && resp.position) {
        walkX = resp.position.walkX ?? walkX;
        walkDir = resp.position.walkDir ?? walkDir;
        isWalkIdle = resp.position.isWalkIdle ?? isWalkIdle;
        // Apply position immediately
        if (!userPositioned) {
          overlay.style.right = (80 - walkX) + "px";
        }
        updateCrabAnimClass();
      }
    } catch (e) {}
  }

  function becomeActiveWalker() {
    if (isActiveWalker) return;
    isActiveWalker = true;
    if (currentState === "idle" && !isSleepingLocally) {
      startWalking();
    }
    // Periodically save position so other tabs can pick it up
    if (positionSyncTimer) clearInterval(positionSyncTimer);
    positionSyncTimer = setInterval(() => {
      if (isActiveWalker) savePositionToBackground();
    }, 250);
  }

  function releaseActiveWalker() {
    if (!isActiveWalker) return;
    savePositionToBackground();
    isActiveWalker = false;
    stopWalking();
    if (positionSyncTimer) { clearInterval(positionSyncTimer); positionSyncTimer = null; }
  }

  function setupTabSync() {
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        // Tab became visible — pick up position and start walking
        await loadPositionFromBackground();
        becomeActiveWalker();
      } else {
        // Tab hidden — hand off walking
        releaseActiveWalker();
      }
    });

    // Listen for position broadcasts from background (when other tabs save position)
    // This keeps hidden tabs' crab position updated if they become visible via screenshot, etc.
  }

  // ── Init ──
  async function init() {
    await Promise.all([loadSprites(), loadAccessories()]);

    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      if (response) {
        currentState = response.petState?.state || "idle";
        equippedIds = response.accessories || [];
        petName = response.petName || "";
        currentXP = response.xp || 0;
        currentLevel = getLevelFromXP(currentXP);
        siteEffects = response.siteEffects || {};
        crabColor = response.crabColor || 0;
        subAgentData = response.subAgents || [];
      }
    } catch (e) {}

    // Load synced position from background before rendering
    await loadPositionFromBackground();

    renderCrab();
    applyCrabColor();
    syncSubAgents();
    initDragging();
    setupMouseTracking();
    setupTabSync();
    updateCrabAnimClass();

    if (currentState === "idle") {
      startIdleMessages();
      // Only start walking if this tab is visible
      if (document.visibilityState === "visible") {
        becomeActiveWalker();
      }
      resetAutoSleepTimer();
    } else if (currentState === "sleeping") {
      isSleepingLocally = true;
      updateCrabAnimClass();
      typewrite("ZZZ...");
    } else {
      typewrite(STATE_MESSAGES[currentState] || "");
    }
  }

  init();
})();
