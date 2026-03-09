/**
 * Clawchi Extension — Popup Script
 * Pixel-art crab pet with XP/levels, stats, sound, accessories,
 * multiple themes, time-of-day awareness, rare animations,
 * creature rarity, hydration reminders, and streak tracking.
 */

// ── Constants ──
const GRID_SIZE = 64;
const BODY_FILL = "#ef233c";
const POPUP_W = 360;
const POPUP_H = 520;
const AUTO_SLEEP_MS = 20000;

const FACE_COORDS = new Set([
  "15,18", "16,18", "15,19", "16,19",
  "23,18", "24,18", "23,19", "24,19",
  "18,20", "19,20", "20,20", "21,20",
]);

// ── Level System ──
// XP thresholds for levels 1-9
const LEVEL_XP = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3250];

// ══════════════════════════════════════════════════
//  TIME-OF-DAY SYSTEM
// ══════════════════════════════════════════════════

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 7) return "early_morning";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 13) return "late_morning";
  if (hour >= 13 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "late_afternoon";
  if (hour >= 19 && hour < 22) return "evening";
  if (hour >= 22 || hour < 1) return "night";
  return "late_night";
}

const TIME_MESSAGES = {
  early_morning: [
    "RISE AND SHINE, EARLY BIRD!",
    "THE EARLY CRAB GETS THE WORM!",
    "*YAWNS* ...IS IT MORNING?",
    "UP BEFORE THE SUN? RESPECT!",
    "GOOD MORNING SUNSHINE!",
    "DAWN PATROL CRAB, REPORTING!",
  ],
  morning: [
    "GOOD MORNING! LET'S GOOO!",
    "BEAUTIFUL DAY TO BE A CRAB!",
    "COFFEE? TEA? SEAWEED LATTE?",
    "TOP OF THE MORNING TO YA!",
    "LET'S GET THIS KELP!",
    "MORNING STRETCH... PINCH PINCH!",
  ],
  late_morning: [
    "IS IT LUNCH YET? I'M HUNGRY!",
    "THE MORNING IS FLYING BY!",
    "MID-MORNING CRAB CHECK-IN!",
    "ANYONE ELSE SMELL LUNCH?",
    "HALFWAY TO SNACK O'CLOCK!",
    "BRUNCH SOUNDS AMAZING RN...",
  ],
  afternoon: [
    "GOOD AFTERNOON, FRIEND!",
    "POST-LUNCH VIBES... SO COZY!",
    "AFTERNOON CRAB, REPORTING IN!",
    "HOPE YOUR DAY IS GOING GREAT!",
    "THE AFTERNOON SUN IS NICE...",
    "FOOD COMA? ...SAME.",
  ],
  late_afternoon: [
    "ALMOST DONE FOR THE DAY?",
    "THE SUN IS GETTING LOW...",
    "GOLDEN HOUR CRAB VIBES!",
    "WINDING DOWN? ME TOO... NOT!",
    "LATE AFTERNOON = NAP TIME?",
    "SUNSET IS COMING... PRETTY!",
  ],
  evening: [
    "GOOD EVENING! WINDING DOWN?",
    "DINNER TIME? BRING ME ALGAE!",
    "EVENING CRAB, AT YOUR SERVICE!",
    "HOPE TODAY WAS A GOOD ONE!",
    "THE STARS ARE COMING OUT...",
    "COZY EVENING VIBES!",
  ],
  night: [
    "STILL UP? ME TOO, OBVIOUSLY!",
    "NIGHT OWL? MORE LIKE NIGHT CRAB!",
    "THE MOON LOOKS PRETTY TONIGHT...",
    "LATE NIGHT CODING SESSION?",
    "DON'T FORGET TO SLEEP SOON!",
    "BURNING THE MIDNIGHT OIL!",
  ],
  late_night: [
    "GO TO BED, YOU NERD! (LOVINGLY)",
    "IT'S SO LATE... I'M WORRIED!",
    "EVEN CRABS NEED BEAUTY SLEEP!",
    "3AM CLUB? ...WE SHOULD QUIT.",
    "THE OCEAN IS SO QUIET AT NIGHT...",
    "SHHH... THE FISH ARE SLEEPING!",
  ],
};

const GENERAL_IDLE = [
  "JUST VIBING... CRAB STYLE!",
  "POKE ME! I DARE YOU!",
  "SNIP SNIP! JUST PRACTICING!",
  "CLICK CLACK CLICK CLACK!",
  "GOT ANY SNACKS? ASKING 4 A FRIEND",
  "I WONDER WHAT FISH THINK ABOUT...",
  "DID YOU KNOW CRABS WALK SIDEWAYS?",
  "MY CLAWS ARE LOOKING EXTRA SHARP!",
  "WAITING HERE LIKE A GOOD CRABBO!",
  "LA LA LA... CRAB LA LA...",
  "I'M NOT LAZY, I'M ENERGY EFFICIENT!",
  "BOOP MY NOSE! ...I DON'T HAVE ONE.",
  "CRAB FACT: I'M ADORABLE.",
  "WHAT IF CRABS HAD TINY THUMBS?",
  "BEING CUTE IS A FULL TIME JOB!",
  "WIGGLE WIGGLE WIGGLE!",
  "DO RE MI FA SO LA TI CRAB!",
  "I BELIEVE IN YOU! GO GET 'EM!",
  "YOU'RE DOING GREAT, BESTIE!",
  "PINCH PINCH! LOVE PINCH!",
  "IMAGINE ME WITH A TINY HAT... OH WAIT",
  "WHAT'S CRACKIN'? ...GET IT?",
  "I'M THE CRAB-SOLUTE BEST!",
  "CLAWS UP IF YOU'RE AWESOME!",
  "FEELING CLAW-SOME TODAY!",
];

const HYDRATION_MESSAGES = [
  "HEY! DRINK SOME WATER!",
  "WATER CHECK! HYDRATE, BESTIE!",
  "YOUR CRAB COMMANDS: DRINK WATER!",
  "HYDRATION STATION! CHOO CHOO!",
  "SIP SIP HOORAY! WATER TIME!",
  "WATER BREAK! YOUR BODY WILL THANK U!",
  "GLUG GLUG! H2O TIME, FRIEND!",
  "EVEN CRABS STAY HYDRATED!",
];

const STATE_MESSAGES = {
  idle: null,
  thinking: "HMMMM... THINKING REAL HARD!",
  working: "BUSY BUSY! WRITING CODE!",
  sleeping: "ZZZ... DREAMING OF THE OCEAN...",
  error: "OOPSIE! SOMETHING BROKE!",
  celebrating: "WOOHOO! WE DID IT!!!",
  "needs-input": "PSST! HEY! I NEED YOUR HELP!",
};

const ACCESSORY_MESSAGES = {
  "top-hat":       "FEELING FANCY! PINKY OUT!",
  "crown":         "ALL HAIL THE CRAB KING!",
  "sunglasses":    "DEAL WITH IT. B)",
  "party-hat":     "PARTY TIME! WHERE'S THE CAKE?",
  "bow-tie":       "BOW TIES ARE COOL! TRUST ME!",
  "wizard-hat":    "EXPECTO CRAB-TRONUM!",
  "santa-hat":     "HO HO HO! MERRY CRABMAS!",
  "headphones":    "VIBING TO MY OCEAN PLAYLIST!",
  "backwards-cap": "COOL CRABS DON'T LOOK BACK!",
  "bandana":       "ARRR! CAPTAIN CRABBEARD!",
  "cigarette":     "BAD TO THE SHELL.",
  "gold-chain":    "BLING BLING! DRIP CHECK!",
  "halo":          "I'M AN ANGEL... PROBABLY!",
  "devil-horns":   "HEHE... FEELING MISCHIEVOUS!",
  "angel-wings":   "I CAN FLY! ...NOPE. NOPE I CAN'T.",
  "small-shoes":   "FRESH KICKS! LOOK AT THESE!",
  "rainbow-skin":  "I'M FABULOUS AND I KNOW IT!",
  "money-stacks":  "MAKING IT RAIN IN THE OCEAN!",
};

const ACCESSORY_REMOVE_MESSAGES = [
  "BACK TO AU NATUREL!",
  "NAKED CRAB IS BEST CRAB!",
  "LESS IS MORE! ...RIGHT?",
  "FREE AS A CRAB CAN BE!",
  "WHO NEEDS CLOTHES ANYWAY!",
];

const STREAK_MESSAGES = [
  "DAY {n} TOGETHER! BESTIES!",
  "DAY {n}! STILL CRABBIN'!",
  "{n} DAYS AND COUNTING!",
  "DAY {n} OF BEING AWESOME!",
  "WE'VE BEEN PALS FOR {n} DAYS!",
];

const HYDRATION_HOURS = [9, 12, 15, 18];

// ── State ──
let currentState = "idle";
let currentTheme = "ocean";
let spriteData = {};
let accessoryData = [];
let equippedIds = [];
let overlayTimers = {};
let fishAnimFrame = null;
let petName = "";
let typewriterTimer = null;
let activeFish = [];
let activeBeachCrabs = [];
let autoSleepTimer = null;
let idleMessageTimer = null;
let rareAnimationPlaying = false;
let streakDays = 0;
let lastHydrationHour = -1;
let hydrationCheckTimer = null;
let relaySubAgents = [];
let lastSubAgentMessages = {};

// XP & Level
let currentXP = 0;
let currentLevel = 1;
let xpTickTimer = null;

// Stats
let hunger = 100;
let happiness = 100;
let statsDecayTimer = null;

// Sound
let audioCtx = null;
let soundEnabled = true;
let soundVolume = 50;

// Settings
let autoSleepEnabled = true;
let hydrationEnabled = true;

// Crab Color
let crabColor = 0; // hue-rotate degrees (0 = default red)

// Desktop Mode
let desktopModeEnabled = false;
const SITE_EFFECTS_LIST = [
  { id: "youtube.com", name: "YOUTUBE" },
  { id: "twitch.tv", name: "TWITCH" },
  { id: "netflix.com", name: "NETFLIX" },
  { id: "open.spotify.com", name: "SPOTIFY" },
  { id: "github.com", name: "GITHUB" },
  { id: "google.com", name: "GOOGLE" },
  { id: "x.com", name: "X / TWITTER" },
  { id: "reddit.com", name: "REDDIT" },
  { id: "gmail.com", name: "GMAIL" },
  { id: "docs.google.com", name: "GOOGLE DOCS" },
  { id: "discord.com", name: "DISCORD" },
  { id: "chatgpt.com", name: "CHATGPT" },
  { id: "notion.so", name: "NOTION" },
  { id: "amazon.com", name: "AMAZON" },
  { id: "wikipedia.org", name: "WIKIPEDIA" },
  { id: "stackoverflow.com", name: "STACK OVERFLOW" },
  { id: "linkedin.com", name: "LINKEDIN" },
  { id: "instagram.com", name: "INSTAGRAM" },
  { id: "facebook.com", name: "FACEBOOK" },
];
let siteEffects = {}; // { "youtube.com": true, ... }

// ── DOM ──
const petSvg = document.getElementById("pet-svg");
const statusTypewriter = document.getElementById("status-typewriter");
const petNameDisplay = document.getElementById("pet-name-display");
const accessoryGrid = document.getElementById("accessory-grid");
const accessoryPanel = document.getElementById("accessory-panel");
const settingsPanel = document.getElementById("settings-panel");
const statsPanel = document.getElementById("stats-panel");
const adminPanel = document.getElementById("admin-panel");
const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("name-input");
const bgEl = document.getElementById("underwater-bg");

// ══════════════════════════════════════════════════
//  SOUND SYSTEM
// ══════════════════════════════════════════════════

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Initialize AudioContext on first user interaction (required by browsers)
document.addEventListener("click", function _initAudio() {
  getAudioContext();
  document.removeEventListener("click", _initAudio);
}, { once: true });

function playBubbleSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const vol = (soundVolume / 100) * 0.5;
    const t = ctx.currentTime;

    // Pop 1: sine sweep down (the main "pop")
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(600, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.25);
    gain1.gain.setValueAtTime(vol, t);
    gain1.gain.setValueAtTime(vol, t + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // Pop 2: triangle overtone (adds body)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(900, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(300, t + 0.2);
    gain2.gain.setValueAtTime(vol * 0.4, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.02);
    osc2.stop(t + 0.25);

    // Pop 3: high blip (the "sparkle")
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1200, t + 0.08);
    osc3.frequency.exponentialRampToValueAtTime(500, t + 0.2);
    gain3.gain.setValueAtTime(vol * 0.25, t + 0.08);
    gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(t + 0.08);
    osc3.stop(t + 0.22);
  } catch (e) {
    // Audio not available
  }
}

// ══════════════════════════════════════════════════
//  XP & LEVEL SYSTEM
// ══════════════════════════════════════════════════

function getLevelFromXP(xp) {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

function addXP(amount) {
  const oldLevel = currentLevel;
  currentXP += amount;
  currentLevel = getLevelFromXP(currentXP);

  if (currentLevel > oldLevel) {
    typewrite(`LEVEL UP! LV.${currentLevel}!`);
    playBubbleSound();
    petSvg.style.animation = "level-up-flash 0.6s ease 2";
    setTimeout(() => { petSvg.style.animation = ""; }, 1200);
    renderPet(); // re-render at new size
  }

  updateXPBar();
  chrome.storage.local.set({ xp: currentXP });
}

function updateXPBar() {
  const levelXP = LEVEL_XP[Math.min(currentLevel - 1, LEVEL_XP.length - 1)];
  const isMax = currentLevel >= LEVEL_XP.length;
  const nextLevelXP = isMax ? levelXP : LEVEL_XP[currentLevel];
  const xpInLevel = currentXP - levelXP;
  const xpNeeded = nextLevelXP - levelXP;
  const pct = isMax ? 100 : Math.min(100, (xpInLevel / Math.max(1, xpNeeded)) * 100);

  const levelEl = document.getElementById("level-display");
  const fillEl = document.getElementById("xp-bar-fill");

  if (levelEl) levelEl.textContent = isMax ? `LV.MAX` : `LV.${currentLevel}`;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

function getPetSize() {
  // Level 1 = 120px, Level 9 = 240px
  return 120 + (currentLevel - 1) * 15;
}

function startXPTick() {
  if (xpTickTimer) clearInterval(xpTickTimer);
  xpTickTimer = setInterval(() => {
    addXP(1); // 1 XP every 30 seconds popup is open
  }, 30000);
}

// ══════════════════════════════════════════════════
//  STATS SYSTEM (Hunger + Happiness)
// ══════════════════════════════════════════════════

function startStatsDecay() {
  if (statsDecayTimer) clearInterval(statsDecayTimer);
  statsDecayTimer = setInterval(() => {
    // Hunger: -1% every ~3 minutes (0.33 per minute)
    hunger = Math.max(0, hunger - 0.33);
    // Happiness: -1% every ~6 minutes (0.17 per minute)
    happiness = Math.max(0, happiness - 0.17);
    updateStatsDisplay();
    chrome.storage.local.set({ hunger, happiness });
  }, 60000);
}

// ── Food items ──
const FOOD_ITEMS = [
  { id: "burger",  hunger: 30, happiness: 5,  xp: 3, msgs: ["BURGER TIME! CHOMP!",  "BEST BURGER EVER!",  "NOM NOM NOM!"] },
  { id: "fish",    hunger: 25, happiness: 10, xp: 4, msgs: ["FRESH FISH! MY FAVE!",  "OCEAN FOOD = BEST FOOD!",  "SASHIMI? FOR ME?!"] },
  { id: "cake",    hunger: 15, happiness: 20, xp: 3, msgs: ["CAKE!! IS IT MY BDAY?!", "FROSTING ON MY CLAWS!",  "SUGAR RUSH INCOMING!"] },
  { id: "apple",   hunger: 20, happiness: 5,  xp: 2, msgs: ["CRUNCH! HEALTHY CRAB!",  "AN APPLE A DAY!",  "JUICY!"] },
  { id: "cookie",  hunger: 15, happiness: 15, xp: 2, msgs: ["COOKIE MONSTER MODE!",   "CHOCO CHIP! MY WEAKNESS!", "ONE MORE? PLEASE?"] },
  { id: "pizza",   hunger: 30, happiness: 10, xp: 3, msgs: ["PIZZA PIZZA PIZZA!",     "EXTRA CHEESE PLS!",  "MAMMA MIA!"] },
  { id: "sushi",   hunger: 25, happiness: 15, xp: 5, msgs: ["OISHII! SUSHI TIME!",    "FANCY CRAB DINNER!",  "I FEEL SO CULTURED!"] },
];

function feedWithFood(food) {
  hunger = Math.min(100, hunger + food.hunger);
  happiness = Math.min(100, happiness + food.happiness);
  updateStatsDisplay();
  addXP(food.xp);
  const msg = food.msgs[Math.floor(Math.random() * food.msgs.length)];
  typewrite(msg);
  playBubbleSound();
  chrome.storage.local.set({ hunger, happiness });
  // Munching animation
  petSvg.classList.remove("munching");
  void petSvg.offsetWidth;
  petSvg.classList.add("munching");
  setTimeout(() => petSvg.classList.remove("munching"), 850);
}

function buildFoodGrid() {
  const grid = document.getElementById("food-grid");
  grid.innerHTML = "";

  // Hint text (only add once)
  if (!grid.parentElement.querySelector(".food-drag-hint")) {
    const hint = document.createElement("div");
    hint.className = "food-drag-hint";
    hint.textContent = "DRAG ONTO CRAB TO FEED";
    grid.parentElement.insertBefore(hint, grid);
  }

  for (const food of FOOD_ITEMS) {
    const btn = document.createElement("button");
    btn.className = "food-btn";
    btn.title = `${food.id.toUpperCase()} (+${food.hunger} hunger, +${food.happiness} happy)`;
    const img = document.createElement("img");
    img.src = `sprites/food/${food.id}.png`;
    img.alt = food.id;
    btn.appendChild(img);
    initFoodDrag(btn, food);
    grid.appendChild(btn);
  }
}

function initFoodDrag(btn, food) {
  let isDragging = false;
  let ghost = null;
  let startX, startY;

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
  });

  btn.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  }, { passive: true });

  function onMove(e) { move(e.clientX, e.clientY); }
  function onTouchMove(e) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }

  function move(cx, cy) {
    if (!isDragging) {
      if (Math.abs(cx - startX) > 5 || Math.abs(cy - startY) > 5) {
        isDragging = true;
        ghost = document.createElement("img");
        ghost.src = btn.querySelector("img").src;
        ghost.className = "food-drag-ghost";
        document.body.appendChild(ghost);
      } else return;
    }
    ghost.style.left = (cx - 22) + "px";
    ghost.style.top = (cy - 22) + "px";

    // Highlight crab if hovering over it
    const crabRect = petSvg.getBoundingClientRect();
    const overCrab = cx >= crabRect.left && cx <= crabRect.right && cy >= crabRect.top && cy <= crabRect.bottom;
    petSvg.style.filter = overCrab ? "brightness(1.3)" : "";
  }

  function onEnd(e) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onEnd);
    finish(e.clientX, e.clientY);
  }

  function onTouchEnd(e) {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    const t = e.changedTouches[0];
    finish(t.clientX, t.clientY);
  }

  function finish(cx, cy) {
    petSvg.style.filter = "";
    if (ghost) { ghost.remove(); ghost = null; }
    if (!isDragging) {
      // Tap/click = also feed (fallback)
      feedWithFood(food);
      isDragging = false;
      return;
    }
    isDragging = false;
    // Check if dropped on crab
    const crabRect = petSvg.getBoundingClientRect();
    if (cx >= crabRect.left && cx <= crabRect.right && cy >= crabRect.top && cy <= crabRect.bottom) {
      feedWithFood(food);
    }
  }
}

function feedPet() {
  hunger = Math.min(100, hunger + 25);
  updateStatsDisplay();
  addXP(3);
  typewrite("YUM YUM! THANK YOU!");
  chrome.storage.local.set({ hunger });
}

function petThePet() {
  happiness = Math.min(100, happiness + 15);
  updateStatsDisplay();
  addXP(2);
  typewrite("AWWW! I LOVE PATS!");
  chrome.storage.local.set({ happiness });
}

// ── Activity Log ──
let activityLog = [];

function addLog(msg) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  activityLog.unshift({ time, msg });
  if (activityLog.length > 50) activityLog.length = 50;
  chrome.storage.local.set({ activityLog });
  renderLog();
}

function renderLog() {
  const list = document.getElementById("log-list");
  if (!list) return;
  list.innerHTML = "";
  if (activityLog.length === 0) {
    list.innerHTML = '<div class="log-entry"><span class="log-msg">NO ENTRIES YET...</span></div>';
    return;
  }
  for (const entry of activityLog) {
    const el = document.createElement("div");
    el.className = "log-entry";
    el.innerHTML = `<span class="log-time">${entry.time}</span><span class="log-msg">${entry.msg}</span>`;
    list.appendChild(el);
  }
}

function updateStatsDisplay() {
  const hungerBar = document.getElementById("hunger-bar");
  const happinessBar = document.getElementById("happiness-bar");
  const hungerValue = document.getElementById("hunger-value");
  const happinessValue = document.getElementById("happiness-value");
  const streakDisplay = document.getElementById("streak-display");
  const statsLevel = document.getElementById("stats-level");

  if (hungerBar) hungerBar.style.width = `${Math.round(hunger)}%`;
  if (happinessBar) happinessBar.style.width = `${Math.round(happiness)}%`;
  if (hungerValue) hungerValue.textContent = `${Math.round(hunger)}%`;
  if (happinessValue) happinessValue.textContent = `${Math.round(happiness)}%`;
  if (streakDisplay) streakDisplay.textContent = `${streakDays} DAY${streakDays !== 1 ? "S" : ""}`;
  if (statsLevel) statsLevel.textContent = `LV.${currentLevel} — ${currentXP} XP`;
}

// ══════════════════════════════════════════════════
//  IDLE MESSAGE SYSTEM (time-aware + cute)
// ══════════════════════════════════════════════════

function pickIdleMessage() {
  if (Math.random() < 0.35) {
    const tod = getTimeOfDay();
    const msgs = TIME_MESSAGES[tod];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  return GENERAL_IDLE[Math.floor(Math.random() * GENERAL_IDLE.length)];
}

function getStreakMessage() {
  if (streakDays <= 0) return null;
  const template = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];
  return template.replace("{n}", streakDays);
}

function startIdleMessageCycle() {
  stopIdleMessageCycle();
  idleMessageTimer = setInterval(() => {
    if (currentState === "idle" && !rareAnimationPlaying) {
      if (Math.random() < 0.08) {
        triggerRareAnimation();
      } else {
        typewrite(pickIdleMessage());
      }
    }
  }, 12000 + Math.random() * 8000);
}

function stopIdleMessageCycle() {
  if (idleMessageTimer) { clearInterval(idleMessageTimer); idleMessageTimer = null; }
}

// ══════════════════════════════════════════════════
//  RARE IDLE ANIMATIONS
// ══════════════════════════════════════════════════

function triggerRareAnimation() {
  const roll = Math.random();
  if (roll < 0.35) blowBubbles();
  else if (roll < 0.70) clawDance();
  else walkOffScreen();
}

function blowBubbles() {
  rareAnimationPlaying = true;
  typewrite("BLUB BLUB BLUB!");
  playBubbleSound();
  const container = document.getElementById("pet-container");
  const sizes = [4, 6, 8, 5, 7, 4, 6, 8];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const bubble = document.createElement("div");
      bubble.className = "pixel-bubble";
      const size = sizes[i];
      const startX = (POPUP_W / 2) - 15 + Math.random() * 30;
      const startY = container.offsetHeight * 0.5;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${startX}px`;
      bubble.style.top = `${startY}px`;
      bubble.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      container.appendChild(bubble);
      setTimeout(() => bubble.remove(), 3500);
    }, i * 200);
  }
  setTimeout(() => { rareAnimationPlaying = false; }, 3500);
}

function clawDance() {
  rareAnimationPlaying = true;
  typewrite("CLAW DANCE! CLAW DANCE!");
  playBubbleSound();

  // Group SVG rects by body part based on their pixel coordinates
  const rects = Array.from(petSvg.querySelectorAll("rect"));
  const leftClawRects = [];
  const rightClawRects = [];
  const legRects = [];

  for (const rect of rects) {
    const x = parseFloat(rect.getAttribute("x"));
    const y = parseFloat(rect.getAttribute("y"));
    if (x < 12 && y < 19) leftClawRects.push(rect);
    else if (x > 27 && y < 19) rightClawRects.push(rect);
    else if (y >= 28) legRects.push(rect);
  }

  // Wrap each group in a <g> with transform
  const ns = "http://www.w3.org/2000/svg";
  function wrapInGroup(rectList, id) {
    if (rectList.length === 0) return null;
    const g = document.createElementNS(ns, "g");
    g.id = id;
    // Insert group before first rect, then move rects into it
    petSvg.insertBefore(g, rectList[0]);
    for (const r of rectList) g.appendChild(r);
    return g;
  }

  const lcGroup = wrapInGroup(leftClawRects, "dance-lc");
  const rcGroup = wrapInGroup(rightClawRects, "dance-rc");
  const lgGroup = wrapInGroup(legRects, "dance-lg");

  // Dance frames: cycle through 4 poses
  const poses = [
    { lc: "translate(0,-2)", rc: "translate(0,1)", lg: "translate(1,0)" },
    { lc: "translate(0,1)", rc: "translate(0,-2)", lg: "translate(-1,0)" },
    { lc: "translate(-1,-3) rotate(-8 8 15)", rc: "translate(1,-3) rotate(8 31 15)", lg: "translate(0,0)" },
    { lc: "translate(0,0)", rc: "translate(0,0)", lg: "translate(0,1)" },
  ];

  let poseIdx = 0;
  const danceInterval = setInterval(() => {
    const pose = poses[poseIdx % poses.length];
    if (lcGroup) lcGroup.setAttribute("transform", pose.lc);
    if (rcGroup) rcGroup.setAttribute("transform", pose.rc);
    if (lgGroup) lgGroup.setAttribute("transform", pose.lg);
    poseIdx++;
  }, 250);

  // Also bounce the bobber slightly
  const bobber = document.getElementById("pet-bobber");
  bobber.style.animation = "none";
  let bounceUp = true;
  const bounceInterval = setInterval(() => {
    bobber.style.transform = bounceUp ? "translateY(-8px)" : "translateY(0)";
    bounceUp = !bounceUp;
  }, 250);

  // After 3 seconds, clean up and re-render
  setTimeout(() => {
    clearInterval(danceInterval);
    clearInterval(bounceInterval);
    bobber.style.transform = "";
    bobber.style.animation = "pet-bob 3s ease-in-out infinite";
    renderPet();
    rareAnimationPlaying = false;
    typewrite("NAILED IT!");
  }, 3000);
}

function walkOffScreen() {
  rareAnimationPlaying = true;
  const container = document.getElementById("pet-container");
  const bobber = document.getElementById("pet-bobber");
  const dir = Math.random() > 0.5 ? 1 : -1;

  const leaveMsgs = dir > 0
    ? ["BRB! NEED SOME ME TIME!", "GOTTA GO! BE RIGHT BACK!", "OFF ON AN ADVENTURE!"]
    : ["HMPH! GOING FOR A WALK!", "I NEED A SNACK BREAK!", "EXPLORING THE REEF!"];
  typewrite(leaveMsgs[Math.floor(Math.random() * leaveMsgs.length)]);

  // Clip the container so the crab disappears at the edge
  container.classList.add("walking-off");
  bobber.style.animation = "none";
  bobber.style.transition = "transform 2s ease-in";
  bobber.style.transform = `translateX(${dir * (POPUP_W + 100)}px)`;

  // Phase 2: gone — show ellipsis
  setTimeout(() => {
    typewrite("...");
  }, 2500);

  // Phase 3: come back from the same side
  setTimeout(() => {
    bobber.style.transition = "transform 2s ease-out";
    bobber.style.transform = "translateX(0)";
    const returnMsgs = ["MISSED ME? OF COURSE YOU DID!", "I'M BACK! DID YA MISS ME?", "HOME SWEET HOME!"];
    typewrite(returnMsgs[Math.floor(Math.random() * returnMsgs.length)]);
  }, 4000);

  // Phase 4: clean up
  setTimeout(() => {
    bobber.style.transition = "";
    bobber.style.animation = "pet-bob 3s ease-in-out infinite";
    container.classList.remove("walking-off");
    rareAnimationPlaying = false;
  }, 6500);
}

// ══════════════════════════════════════════════════
//  HYDRATION SYSTEM
// ══════════════════════════════════════════════════

function startHydrationCheck() {
  if (hydrationCheckTimer) clearInterval(hydrationCheckTimer);
  hydrationCheckTimer = setInterval(checkHydration, 60000);
  setTimeout(checkHydration, 5000);
}

function checkHydration() {
  if (!hydrationEnabled) return;
  if (currentState !== "idle" || rareAnimationPlaying) return;
  const hour = new Date().getHours();
  if (HYDRATION_HOURS.includes(hour) && lastHydrationHour !== hour) {
    lastHydrationHour = hour;
    chrome.storage.local.set({ lastHydrationHour: hour });
    const msg = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];
    typewrite(msg);
  }
}

// ══════════════════════════════════════════════════
//  AUTO-SLEEP & CLICK-TO-WAKE
// ══════════════════════════════════════════════════

function startAutoSleepTimer() {
  clearAutoSleepTimer();
  if (!autoSleepEnabled) return;
  autoSleepTimer = setTimeout(() => {
    if (currentState === "idle") {
      setState("sleeping", "ZZZ... DREAMING OF THE OCEAN...");
    }
  }, AUTO_SLEEP_MS);
}

function clearAutoSleepTimer() {
  if (autoSleepTimer) { clearTimeout(autoSleepTimer); autoSleepTimer = null; }
}

function wakeUp() {
  if (currentState === "sleeping") {
    setState("idle", "");
    petSvg.style.transform = "scale(1.15)";
    setTimeout(() => { petSvg.style.transform = ""; }, 200);
  }
}

// ══════════════════════════════════════════════════
//  TYPEWRITER EFFECT
// ══════════════════════════════════════════════════

function typewrite(text) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  statusTypewriter.textContent = "";
  let i = 0;
  typewriterTimer = setInterval(() => {
    if (i < text.length) {
      statusTypewriter.textContent += text[i];
      i++;
    } else {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
  }, 45);
}

// ══════════════════════════════════════════════════
//  BACKGROUND THEMES
// ══════════════════════════════════════════════════

const THEMES = {
  ocean: {
    gradient: "linear-gradient(180deg, #5ec4d0 0%, #48a8b8 30%, #3890a0 55%, #2a7080 100%)",
    terrain: {
      back:  { fill: "#2a7a88", plant: "#237068", seaweed: "#1e6860" },
      mid:   { fill: "#1e6878", plant: "#185860", seaweed: "#134850" },
      front: { fill: "#145060", plant: "#0e4048", seaweed: "#0a3540" },
    },
    fishColors: ["#2a7888", "#3a90a0", "#1e6070", "#348898", "#257080"],
    fishEye: "#0a2530",
    bubbles: true,
    lightRays: true,
    particles: "bubbles",
    reefHills: {
      back:  [{ x: 15, h: 8, w: 25 }, { x: 45, h: 6, w: 30 }, { x: 75, h: 9, w: 28 }],
      mid:   [{ x: 10, h: 5, w: 20 }, { x: 40, h: 7, w: 25 }, { x: 70, h: 6, w: 22 }, { x: 88, h: 4, w: 15 }],
      front: [{ x: 12, h: 4, w: 22 }, { x: 45, h: 5, w: 28 }, { x: 78, h: 4, w: 24 }],
    },
    plants: {
      back:  { coral: [{ x:10,t:0 },{ x:30,t:4 },{ x:50,t:2 },{ x:70,t:1 },{ x:85,t:5 }], seaweed: [{ x:22,t:0 },{ x:60,t:2 }] },
      mid:   { coral: [{ x:8,t:3 },{ x:25,t:5 },{ x:45,t:6 },{ x:65,t:2 },{ x:82,t:4 }], seaweed: [{ x:15,t:0 },{ x:50,t:3 },{ x:78,t:1 }] },
      front: { coral: [{ x:6,t:4 },{ x:22,t:6 },{ x:42,t:5 },{ x:60,t:2 },{ x:80,t:4 }], seaweed: [{ x:14,t:2 },{ x:52,t:0 },{ x:72,t:3 }] },
    },
  },
  beach: {
    gradient: "linear-gradient(180deg, #87CEEB 0%, #68b8e0 25%, #52a8d8 50%, #e8c87a 65%, #d4a854 75%, #c49545 100%)",
    terrain: {
      back:  { fill: "#d4a854", plant: "#5a9e3a", seaweed: "#4a8e30" },
      mid:   { fill: "#c49545", plant: "#4a8e30", seaweed: "#3a7e26" },
      front: { fill: "#b48838", plant: "#3a7e26", seaweed: "#2a6e1c" },
    },
    fishColors: [],
    fishEye: "#2a1508",
    noFish: true,
    bubbles: false,
    lightRays: false,
    particles: "none",
    reefHills: {
      back:  [{ x: 10, h: 4, w: 35 }, { x: 50, h: 3, w: 40 }, { x: 80, h: 5, w: 30 }],
      mid:   [{ x: 20, h: 3, w: 30 }, { x: 55, h: 4, w: 35 }, { x: 85, h: 3, w: 25 }],
      front: [{ x: 15, h: 2, w: 35 }, { x: 50, h: 3, w: 40 }, { x: 80, h: 2, w: 30 }],
    },
    plants: {
      back:  { coral: [{ x:18,t:0 },{ x:72,t:3 }], seaweed: [{ x:35,t:1 },{ x:58,t:2 }] },
      mid:   { coral: [{ x:12,t:2 },{ x:50,t:5 },{ x:80,t:1 }], seaweed: [{ x:28,t:0 },{ x:65,t:3 }] },
      front: { coral: [{ x:8,t:4 },{ x:40,t:6 },{ x:75,t:2 }], seaweed: [{ x:22,t:1 },{ x:55,t:0 }] },
    },
    palmTrees: [{ x: 65, h: 28 }, { x: 82, h: 22 }],
  },
  night: {
    gradient: "linear-gradient(180deg, #0a0e1a 0%, #121830 20%, #1a2040 45%, #1e2848 65%, #1a2540 100%)",
    terrain: {
      back:  { fill: "#151a30", plant: "#1a2848", seaweed: "#152040" },
      mid:   { fill: "#101528", plant: "#141e3a", seaweed: "#101830" },
      front: { fill: "#0c1020", plant: "#0e1630", seaweed: "#0a1228" },
    },
    fishColors: ["#2040a0", "#3050b0", "#1838a8", "#2848b8", "#1a3090"],
    fishEye: "#aaccff",
    bubbles: true,
    lightRays: false,
    particles: "stars",
    reefHills: {
      back:  [{ x: 15, h: 7, w: 28 }, { x: 50, h: 5, w: 32 }, { x: 80, h: 8, w: 26 }],
      mid:   [{ x: 10, h: 5, w: 24 }, { x: 42, h: 6, w: 28 }, { x: 75, h: 5, w: 22 }, { x: 90, h: 3, w: 15 }],
      front: [{ x: 14, h: 3, w: 25 }, { x: 48, h: 4, w: 30 }, { x: 80, h: 3, w: 22 }],
    },
    plants: {
      back:  { coral: [{ x:12,t:0 },{ x:45,t:3 },{ x:70,t:5 }], seaweed: [{ x:25,t:1 },{ x:60,t:2 }] },
      mid:   { coral: [{ x:8,t:2 },{ x:30,t:6 },{ x:55,t:4 },{ x:82,t:1 }], seaweed: [{ x:18,t:0 },{ x:48,t:3 },{ x:75,t:1 }] },
      front: { coral: [{ x:10,t:4 },{ x:35,t:5 },{ x:60,t:2 },{ x:85,t:3 }], seaweed: [{ x:20,t:2 },{ x:50,t:0 },{ x:70,t:3 }] },
    },
  },
};

// ══════════════════════════════════════════════════
//  PIXEL-ART TERRAIN
// ══════════════════════════════════════════════════

const REEF_GRID_W = 90;
const REEF_GRID_H = 50;

function generateHillProfile(hills, baseY) {
  const y = new Array(REEF_GRID_W + 1).fill(baseY);
  for (const hill of hills) {
    for (let x = 0; x <= REEF_GRID_W; x++) {
      const d = (x - hill.x) / hill.w;
      if (Math.abs(d) < 1.5) {
        const rise = hill.h * Math.max(0, (1 + Math.cos(d * Math.PI * 0.7)) / 2);
        y[x] = Math.min(y[x], baseY - Math.round(rise));
      }
    }
  }
  return y;
}

const CORAL_TEMPLATES = [
  [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[1,5],[2,6],[2,7],[-1,3],[-2,4],[-2,5],[0,8],[1,8]],
  [[0,0],[0,1],[0,2],[0,3],[-1,4],[-2,5],[-2,6],[1,4],[2,5],[2,6]],
  [[0,0],[0,1],[0,2],[0,3],[-1,2],[1,2],[-1,3],[1,3],[-2,3],[2,3]],
  [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,3],[2,4],[-1,5]],
  [[0,0],[0,1],[0,2],[1,1],[-1,2]],
  [[0,0],[0,1],[0,2],[-1,0],[1,0],[-2,1],[-1,1],[1,1],[2,1],[-1,2],[1,2]],
  [[0,0],[0,1],[0,2],[-1,1],[1,1],[-1,2],[1,2],[0,3]],
];

const SEAWEED_TEMPLATES = [
  [[0,0],[0,1],[0,2],[1,3],[1,4],[0,5],[0,6],[-1,7],[-1,8],[0,9],[0,10],[1,11],[0,12]],
  [[0,0],[0,1],[0,2],[-1,3],[-1,4],[0,5],[0,6],[0,7],[2,0],[2,1],[2,2],[3,3],[2,4],[2,5]],
  [[0,0],[0,1],[1,2],[1,3],[0,4],[-1,5],[0,6]],
  [[0,0],[1,0],[0,1],[1,1],[0,2],[0,3],[-1,4],[0,5],[0,6],[1,7],[0,8]],
];

const PALM_TRUNK = [
  [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[0,15],
  [1,1],[1,3],[1,5],[1,7],[1,9],[1,11],[1,13],
  [-1,2],[-1,4],[-1,6],[-1,8],[-1,10],[-1,12],[-1,14],
];

const PALM_LEAVES = [
  [1,0],[2,0],[3,0],[4,1],[5,1],[6,2],[7,3],[8,4],[8,5],
  [-1,0],[-2,0],[-3,0],[-4,1],[-5,1],[-6,2],[-7,3],[-8,4],[-8,5],
  [0,-1],[0,-2],[1,-2],[2,-3],[-1,-2],[-2,-3],
  [1,-1],[2,-1],[3,0],[4,0],[5,1],
  [-1,-1],[-2,-1],[-3,0],[-4,0],[-5,1],
  [6,3],[7,4],[-6,3],[-7,4],
];

function renderTerrainLayer(profile, colors, plants, seaweeds, zIndex, heightPct) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${REEF_GRID_W} ${REEF_GRID_H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.classList.add("reef-layer");
  svg.style.height = heightPct;
  svg.style.zIndex = zIndex;

  let pts = "";
  for (let x = 0; x <= REEF_GRID_W; x++) pts += `${x},${profile[x]} `;
  pts += `${REEF_GRID_W},${REEF_GRID_H} 0,${REEF_GRID_H}`;
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  poly.setAttribute("points", pts);
  poly.setAttribute("fill", colors.fill);
  svg.appendChild(poly);

  for (const p of plants) {
    const template = CORAL_TEMPLATES[p.t % CORAL_TEMPLATES.length];
    const baseY = profile[Math.min(p.x, REEF_GRID_W)];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("seaweed-group");
    g.style.setProperty("--sway-dur", `${5 + p.x % 4}s`);
    g.style.transformOrigin = `${p.x}px ${baseY}px`;
    for (const [dx, dy] of template) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", p.x + dx); r.setAttribute("y", baseY - dy - 1);
      r.setAttribute("width", 1); r.setAttribute("height", 1);
      r.setAttribute("fill", colors.plant);
      g.appendChild(r);
    }
    svg.appendChild(g);
  }

  for (const s of seaweeds) {
    const template = SEAWEED_TEMPLATES[s.t % SEAWEED_TEMPLATES.length];
    const baseY = profile[Math.min(s.x, REEF_GRID_W)];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("seaweed-group");
    g.style.setProperty("--sway-dur", `${3.5 + s.x % 3}s`);
    g.style.transformOrigin = `${s.x}px ${baseY}px`;
    for (const [dx, dy] of template) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", s.x + dx); r.setAttribute("y", baseY - dy - 1);
      r.setAttribute("width", 1); r.setAttribute("height", 1);
      r.setAttribute("fill", colors.seaweed);
      g.appendChild(r);
    }
    svg.appendChild(g);
  }

  bgEl.appendChild(svg);
}

function renderPalmTrees(theme) {
  if (!theme.palmTrees) return;
  for (const palm of theme.palmTrees) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const treeW = 20, treeH = 24;
    svg.setAttribute("viewBox", `${-10} ${-4} ${treeW} ${treeH}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.classList.add("palm-tree");
    svg.style.position = "absolute";
    svg.style.bottom = "40%";
    svg.style.left = `${palm.x - 8}%`;
    svg.style.width = "22%";
    svg.style.height = `${palm.h + 10}%`;
    svg.style.zIndex = "1";
    svg.style.imageRendering = "pixelated";

    for (const [dx, dy] of PALM_TRUNK) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", dx); r.setAttribute("y", dy);
      r.setAttribute("width", 1); r.setAttribute("height", 1);
      r.setAttribute("fill", dy % 3 === 0 ? "#8B6914" : "#7a5c12");
      svg.appendChild(r);
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("seaweed-group");
    g.style.setProperty("--sway-dur", `${6 + palm.x % 3}s`);
    g.style.transformOrigin = "0px 0px";
    for (const [dx, dy] of PALM_LEAVES) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", dx); r.setAttribute("y", dy);
      r.setAttribute("width", 1); r.setAttribute("height", 1);
      r.setAttribute("fill", dy < 0 ? "#2e8b1a" : "#228B22");
      g.appendChild(r);
    }
    svg.appendChild(g);
    bgEl.appendChild(svg);
  }
}

function renderTerrain(theme) {
  const hills = theme.reefHills;
  const plants = theme.plants;
  const backProfile = generateHillProfile(hills.back, 26);
  renderTerrainLayer(backProfile, theme.terrain.back, plants.back.coral, plants.back.seaweed, 1, "75%");
  const midProfile = generateHillProfile(hills.mid, 30);
  renderTerrainLayer(midProfile, theme.terrain.mid, plants.mid.coral, plants.mid.seaweed, 2, "62%");
  const frontProfile = generateHillProfile(hills.front, 34);
  renderTerrainLayer(frontProfile, theme.terrain.front, plants.front.coral, plants.front.seaweed, 3, "50%");
}

// ══════════════════════════════════════════════════
//  CREATURES (Fish, Turtles, Jellyfish)
// ══════════════════════════════════════════════════

const FISH_SMALL = {
  px: 3, w: 28, h: 18,
  pixels: [[2,0],[3,0],[4,0],[1,1],[2,1],[3,1],[4,1],[5,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[-1,1],[-1,3],[-2,2],[-1,2]],
  eyeIdx: 12, highlightIdx: 10,
};
const FISH_MEDIUM = {
  px: 4, w: 48, h: 32,
  pixels: [[3,0],[4,0],[5,0],[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[2,5],[3,5],[4,5],[5,5],[6,5],[3,6],[4,6],[5,6],[-1,2],[-1,3],[-1,4],[-2,3],[-2,4],[-3,3]],
  eyeIdx: 13, highlightIdx: 10,
};
const FISH_LARGE = {
  px: 5, w: 60, h: 50,
  pixels: [[4,0],[5,0],[3,1],[4,1],[5,1],[6,1],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[3,7],[4,7],[5,7],[6,7],[4,8],[5,8],[-1,3],[-1,4],[-1,5],[-2,2],[-2,3],[-2,4],[-2,5],[-2,6],[-3,3],[-3,5]],
  eyeIdx: 13, highlightIdx: 8,
};

const TURTLE_SPRITE = {
  px: 4, w: 44, h: 24,
  pixels: [
    [3,0],[4,0],[5,0],
    [2,1],[3,1],[4,1],[5,1],[6,1],
    [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],
    [2,3],[3,3],[4,3],[5,3],[6,3],
    [3,4],[4,4],[5,4],
    [8,2],[8,3],[9,2],
    [0,1],[-1,0],
    [0,3],[-1,4],
    [8,1],[8,4],
  ],
  eyeIdx: 25, highlightIdx: 1,
};

const JELLYFISH_SPRITE = {
  px: 3, w: 24, h: 30,
  pixels: [
    [2,0],[3,0],[4,0],
    [1,1],[2,1],[3,1],[4,1],[5,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],
    [1,4],[3,4],[5,4],
    [1,5],[3,5],[5,5],
    [2,6],[4,6],
    [2,7],[4,7],
    [1,8],[5,8],
  ],
  eyeIdx: 11, highlightIdx: 1,
};

function createFishElement(template, color, dir, eyeColor) {
  const { px, pixels, eyeIdx, highlightIdx } = template;
  const light = mixColor(color, "#ffffff", 0.3);
  const el = document.createElement("div");
  el.className = "pixel-fish";
  const flipDiv = document.createElement("div");
  flipDiv.style.display = "inline-block";
  if (dir === "left") flipDiv.style.transform = "scaleX(-1)";
  const bobDiv = document.createElement("div");
  bobDiv.className = "fish-bob";
  bobDiv.style.setProperty("--bob-dur", `${1.5 + Math.random() * 1.5}s`);
  bobDiv.style.setProperty("--bob-amount", `${2 + Math.random() * 3}px`);
  pixels.forEach((coords, i) => {
    const d = document.createElement("div");
    d.className = "fish-pixel";
    let c = color;
    if (i === eyeIdx) c = eyeColor;
    else if (i === highlightIdx) c = light;
    d.style.cssText = `left:${coords[0]*px}px;top:${coords[1]*px}px;width:${px}px;height:${px}px;background:${c};`;
    bobDiv.appendChild(d);
  });
  flipDiv.appendChild(bobDiv);
  el.appendChild(flipDiv);
  return el;
}

function spawnCreatures(theme) {
  const fishColors = theme.fishColors;
  const eyeColor = theme.fishEye;
  const isNight = currentTheme === "night";

  const turtleColors = isNight
    ? ["#1a4a5a", "#204858", "#183e50", "#1c4250"]
    : ["#2e8b57", "#3a9968", "#228b44", "#2d8050"];
  const jellyColors = isNight
    ? ["#6a5acd", "#7b68ee", "#5a4abf", "#6050d0"]
    : ["#da70d6", "#c860c8", "#e080e0", "#b850b8"];

  const spawns = [
    { t: FISH_SMALL, count: 3, type: "fish" },
    { t: FISH_MEDIUM, count: 2, type: "fish" },
    { t: FISH_LARGE, count: 1, type: "fish" },
    { t: TURTLE_SPRITE, count: 1, type: "turtle" },
    { t: JELLYFISH_SPRITE, count: 1, type: "jellyfish" },
  ];

  for (const { t, count, type } of spawns) {
    for (let i = 0; i < count; i++) {
      const isGolden = Math.random() < 0.005;
      const dir = Math.random() > 0.5 ? "right" : "left";

      let color;
      if (isGolden) color = "#FFD700";
      else if (type === "turtle") color = turtleColors[Math.floor(Math.random() * turtleColors.length)];
      else if (type === "jellyfish") color = jellyColors[Math.floor(Math.random() * jellyColors.length)];
      else color = fishColors[Math.floor(Math.random() * fishColors.length)];

      const el = createFishElement(t, color, dir, isGolden ? "#8B0000" : eyeColor);
      if (isGolden) el.classList.add("golden-creature");

      const x = Math.random() * (POPUP_W + t.w) - t.w;
      const y = POPUP_H * 0.50 + Math.random() * (POPUP_H * 0.22);

      let speed;
      if (type === "turtle") speed = 0.02 + Math.random() * 0.04;
      else if (type === "jellyfish") speed = 0.015 + Math.random() * 0.03;
      else speed = (0.08 + Math.random() * 0.15) * (t === FISH_LARGE ? 0.4 : t === FISH_MEDIUM ? 0.6 : 1);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      bgEl.appendChild(el);

      activeFish.push({
        el, x, y,
        speed: dir === "right" ? speed : -speed,
        dir, w: t.w, baseY: y,
        driftAmp: type === "jellyfish" ? 8 + Math.random() * 10 : 4 + Math.random() * 6,
        driftSpeed: type === "jellyfish" ? 0.0003 + Math.random() * 0.0003 : 0.0001 + Math.random() * 0.0002,
        driftOffset: Math.random() * Math.PI * 2,
        isGolden,
      });
    }
  }
}

function animateFish(timestamp) {
  for (const fish of activeFish) {
    fish.x += fish.speed;
    if (fish.speed > 0 && fish.x > POPUP_W + 10) fish.x = -fish.w - 10;
    else if (fish.speed < 0 && fish.x < -fish.w - 10) fish.x = POPUP_W + 10;
    const drift = Math.sin(timestamp * fish.driftSpeed + fish.driftOffset) * fish.driftAmp;
    fish.el.style.left = `${fish.x}px`;
    fish.el.style.top = `${fish.baseY + drift}px`;
  }
  for (const crab of activeBeachCrabs) {
    crab.x += crab.speed;
    if (crab.x > crab.maxX) { crab.speed = -Math.abs(crab.speed); crab.flipDiv.style.transform = "scaleX(1)"; }
    else if (crab.x < crab.minX) { crab.speed = Math.abs(crab.speed); crab.flipDiv.style.transform = "scaleX(-1)"; }
    crab.el.style.left = `${crab.x}px`;
  }
  fishAnimFrame = requestAnimationFrame(animateFish);
}

// ══════════════════════════════════════════════════
//  BEACH CRABS
// ══════════════════════════════════════════════════

const MINI_CRAB_SMALL = {
  px: 2, w: 20, h: 14,
  pixels: [
    [2,1],[3,1],[4,1],
    [1,2],[2,2],[3,2],[4,2],[5,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],
    [2,4],[3,4],[4,4],
    [2,1],[4,1],
    [0,1],[-1,0],[6,1],[7,0],
    [0,3],[0,4],[6,3],[6,4],
    [1,4],[1,5],[5,4],[5,5],
  ],
  eyeIdxs: [16, 17],
};

const MINI_CRAB_LARGE = {
  px: 3, w: 33, h: 21,
  pixels: [
    [3,1],[4,1],[5,1],
    [2,2],[3,2],[4,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],
    [2,4],[3,4],[4,4],[5,4],[6,4],
    [3,5],[4,5],[5,5],
    [3,1],[5,1],
    [0,2],[-1,1],[-1,2],[8,2],[9,1],[9,2],
    [0,4],[0,5],[8,4],[8,5],
    [1,5],[1,6],[7,5],[7,6],
  ],
  eyeIdxs: [23, 24],
};

function createBeachCrabElement(template, color) {
  const { px, pixels, eyeIdxs } = template;
  const el = document.createElement("div");
  el.className = "pixel-fish beach-crab";
  const flipDiv = document.createElement("div");
  flipDiv.style.display = "inline-block";
  const walkDiv = document.createElement("div");
  walkDiv.className = "crab-walk";
  walkDiv.style.setProperty("--walk-dur", `${0.4 + Math.random() * 0.3}s`);
  pixels.forEach((coords, i) => {
    const d = document.createElement("div");
    d.className = "fish-pixel";
    let c = color;
    if (eyeIdxs.includes(i)) c = "#0a0a0a";
    d.style.cssText = `left:${coords[0]*px}px;top:${coords[1]*px}px;width:${px}px;height:${px}px;background:${c};`;
    walkDiv.appendChild(d);
  });
  flipDiv.appendChild(walkDiv);
  el.appendChild(flipDiv);
  return { el, flipDiv };
}

function spawnBeachCrabs() {
  const colors = ["#c44020", "#b83818", "#d04828", "#a83010", "#cc4830"];
  const templates = [{ t: MINI_CRAB_SMALL, count: 3 }, { t: MINI_CRAB_LARGE, count: 2 }];
  for (const { t, count } of templates) {
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const { el, flipDiv } = createBeachCrabElement(t, color);
      const x = Math.random() * (POPUP_W - 40) + 20;
      const y = POPUP_H * 0.72 + Math.random() * (POPUP_H * 0.12);
      const speed = (0.03 + Math.random() * 0.06) * (Math.random() > 0.5 ? 1 : -1);
      if (speed < 0) flipDiv.style.transform = "scaleX(1)";
      else flipDiv.style.transform = "scaleX(-1)";
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      bgEl.appendChild(el);
      activeBeachCrabs.push({ el, flipDiv, x, y, speed, minX: 10, maxX: POPUP_W - t.w - 10 });
    }
  }
}

// ══════════════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════════════

function renderLightRays() {
  const rays = [
    { left: "8%", width: "3%", height: "55%", opacity: 0.06 },
    { left: "25%", width: "2%", height: "45%", opacity: 0.05 },
    { left: "48%", width: "4%", height: "60%", opacity: 0.06 },
    { left: "68%", width: "2%", height: "50%", opacity: 0.04 },
    { left: "85%", width: "3%", height: "55%", opacity: 0.05 },
  ];
  for (let i = 0; i < rays.length; i++) {
    const r = rays[i];
    const div = document.createElement("div");
    div.className = "light-ray";
    div.style.cssText = `left:${r.left};width:${r.width};height:${r.height};background:linear-gradient(180deg,rgba(180,230,240,${r.opacity}) 0%,rgba(180,230,240,0) 100%);animation-delay:${i*1.5}s;`;
    bgEl.appendChild(div);
  }
}

function renderBubbles() {
  const bubbles = [
    {x:"5%",s:4,dur:18,delay:0},{x:"12%",s:5,dur:22,delay:3},{x:"22%",s:4,dur:20,delay:7},
    {x:"32%",s:5,dur:24,delay:1},{x:"42%",s:4,dur:17,delay:5},{x:"52%",s:5,dur:26,delay:9},
    {x:"62%",s:4,dur:21,delay:2},{x:"72%",s:5,dur:23,delay:6},{x:"82%",s:4,dur:19,delay:11},
    {x:"92%",s:5,dur:25,delay:4},{x:"15%",s:4,dur:28,delay:14},{x:"35%",s:5,dur:30,delay:17},
    {x:"55%",s:4,dur:26,delay:20},{x:"75%",s:5,dur:32,delay:16},{x:"95%",s:4,dur:29,delay:22},
  ];
  for (const b of bubbles) {
    const div = document.createElement("div");
    div.className = "bubble";
    div.style.cssText = `left:${b.x};bottom:15%;width:${b.s}px;height:${b.s}px;animation-duration:${b.dur}s;animation-delay:${b.delay}s;animation-name:${Math.random()>0.5?"bubble-rise-alt":"bubble-rise"};`;
    bgEl.appendChild(div);
  }
}

function renderStars() {
  for (let i = 0; i < 40; i++) {
    const div = document.createElement("div");
    div.className = "pixel-star";
    const size = Math.random() > 0.7 ? 3 : 2;
    div.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*45}%;width:${size}px;height:${size}px;animation-delay:${Math.random()*6}s;animation-duration:${2+Math.random()*4}s;`;
    bgEl.appendChild(div);
  }
  const moon = document.createElement("div");
  moon.className = "pixel-moon";
  bgEl.appendChild(moon);
}

function renderBeachClouds() {
  const cloudPixels = [
    [[0,0],[1,0],[2,0],[3,0],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1]],
    [[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],[2,1],[3,1],[-1,0]],
  ];
  const clouds = [{ x:"10%",y:"8%",t:0,dur:60 },{ x:"55%",y:"14%",t:1,dur:80 },{ x:"80%",y:"6%",t:0,dur:70 }];
  for (const c of clouds) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const tpl = cloudPixels[c.t % cloudPixels.length];
    svg.setAttribute("viewBox", "-2 -1 8 4");
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.classList.add("beach-cloud");
    svg.style.cssText = `position:absolute;left:${c.x};top:${c.y};width:50px;height:25px;opacity:0.6;animation:cloud-drift ${c.dur}s linear infinite;image-rendering:pixelated;`;
    for (const [dx, dy] of tpl) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", dx); r.setAttribute("y", dy);
      r.setAttribute("width", 1); r.setAttribute("height", 1);
      r.setAttribute("fill", "#ffffff");
      svg.appendChild(r);
    }
    bgEl.appendChild(svg);
  }
}

// ══════════════════════════════════════════════════
//  THEME MANAGER
// ══════════════════════════════════════════════════

function clearBackground() {
  if (fishAnimFrame) cancelAnimationFrame(fishAnimFrame);
  fishAnimFrame = null;
  activeFish = [];
  activeBeachCrabs = [];
  bgEl.innerHTML = "";
}

function applyTheme(themeId) {
  currentTheme = themeId;
  const theme = THEMES[themeId];
  if (!theme) return;

  clearBackground();
  bgEl.style.background = theme.gradient;

  if (theme.lightRays) renderLightRays();
  if (theme.bubbles) renderBubbles();
  if (theme.particles === "stars") renderStars();
  if (themeId === "beach") {
    renderBeachClouds();
    renderPalmTrees(theme);
  }

  renderTerrain(theme);
  if (!theme.noFish) spawnCreatures(theme);
  if (themeId === "beach") spawnBeachCrabs();
  fishAnimFrame = requestAnimationFrame(animateFish);

  document.querySelectorAll(".theme-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === themeId);
  });
  chrome.storage.local.set({ theme: themeId });
}

// ══════════════════════════════════════════════════
//  PET RENDERING
// ══════════════════════════════════════════════════

async function loadSprites() {
  const [idle, sleeping, thinking, working] = await Promise.all([
    fetch("sprites/base-crab.json").then(r => r.json()),
    fetch("sprites/sleeping.json").then(r => r.json()),
    fetch("sprites/thinking.json").then(r => r.json()),
    fetch("sprites/working.json").then(r => r.json()),
  ]);
  spriteData = { idle, sleeping, thinking, working };
}

async function loadAccessories() {
  const names = ["top-hat","crown","sunglasses","party-hat","bow-tie","wizard-hat","santa-hat","headphones","backwards-cap","bandana","cigarette","gold-chain","halo","devil-horns","angel-wings","small-shoes","rainbow-skin","money-stacks"];
  accessoryData = await Promise.all(names.map(n => fetch(`sprites/accessories/${n}.json`).then(r => r.json())));
}

function computeViewBox(pixels, overlays, accPixels) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const update = p => { if (p.x<minX) minX=p.x; if (p.y<minY) minY=p.y; if (p.x+1>maxX) maxX=p.x+1; if (p.y+1>maxY) maxY=p.y+1; };
  pixels.forEach(update);
  if (overlays) overlays.forEach(o => o.frames.forEach(f => f.forEach(update)));
  if (accPixels) accPixels.forEach(update);
  return `${minX-1} ${minY-1} ${maxX-minX+2} ${maxY-minY+2}`;
}

function getEquippedPixels() {
  const order = ["back","shoes","collar","glasses","hat"];
  const pixels = [], byCategory = {};
  for (const acc of accessoryData) { if (equippedIds.includes(acc.id)) byCategory[acc.category] = acc; }
  for (const cat of order) { if (byCategory[cat]) pixels.push(...byCategory[cat].pixels); }
  return pixels;
}

function renderPet() {
  let spriteKey = currentState;
  if (!spriteData[spriteKey]) spriteKey = "idle";
  const sprite = spriteData[spriteKey];
  if (!sprite) return;

  const accPixels = getEquippedPixels();
  const vb = computeViewBox(sprite.base, sprite.overlays, accPixels);
  const parts = vb.split(" ").map(Number);
  const petSize = getPetSize();
  petSvg.setAttribute("viewBox", vb);
  petSvg.setAttribute("width", petSize);
  petSvg.setAttribute("height", Math.round(petSize * (parts[3] / parts[2])));
  petSvg.innerHTML = "";

  // Body group (gets color filter, accessories stay outside)
  const bodyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  bodyGroup.id = "pet-body";

  const bodyPixels = [], facePixels = [];
  for (const p of sprite.base) {
    if (FACE_COORDS.has(`${p.x},${p.y}`)) facePixels.push(p);
    else bodyPixels.push(p);
  }

  for (const p of bodyPixels) bodyGroup.appendChild(svgRect(p.x, p.y, p.color));
  for (const p of facePixels) bodyGroup.appendChild(svgRect(p.x, p.y, BODY_FILL));

  const faceGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  faceGroup.id = "face-group";
  for (const p of facePixels) faceGroup.appendChild(svgRect(p.x, p.y, p.color));
  bodyGroup.appendChild(faceGroup);

  petSvg.appendChild(bodyGroup);

  clearOverlayTimers();
  if (sprite.overlays) { for (const o of sprite.overlays) renderOverlay(o, bodyGroup); }

  // Accessories outside body group (no color filter)
  for (const p of accPixels) petSvg.appendChild(svgRect(p.x, p.y, p.color));

  // Apply color to body group only
  applyCrabColor();
}

function svgRect(x, y, fill) {
  const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  r.setAttribute("x", x - 0.03); r.setAttribute("y", y - 0.03);
  r.setAttribute("width", 1.06); r.setAttribute("height", 1.06);
  r.setAttribute("fill", fill);
  return r;
}

function renderOverlay(overlay, parent) {
  if (!overlay.frames || !overlay.frames.length) return;
  const target = parent || petSvg;
  const groups = overlay.frames.map((frame, fi) => {
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
  }, overlay.frameDuration || 500);
  overlayTimers[overlay.id] = { interval };
}

function clearOverlayTimers() {
  for (const k of Object.keys(overlayTimers)) clearInterval(overlayTimers[k].interval);
  overlayTimers = {};
}

// ══════════════════════════════════════════════════
//  MOUSE TRACKING
// ══════════════════════════════════════════════════

function setupMouseTracking() {
  document.addEventListener("mousemove", e => {
    if (currentState === "sleeping") return;
    const fg = document.getElementById("face-group");
    if (!fg) return;
    const rect = petSvg.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const t = Math.min(1, dist / 120);
    const len = dist || 1;
    const nx = dx / len, ny = dy / len;
    const maxX = 3, maxY = ny > 0 ? 4 : 2.5;
    fg.setAttribute("transform", `translate(${(nx*maxX*t).toFixed(2)},${(ny*maxY*t).toFixed(2)})`);
  });
  document.addEventListener("mouseleave", () => {
    const fg = document.getElementById("face-group");
    if (fg) fg.setAttribute("transform", "translate(0,0)");
  });
}

// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════

function setState(state, message) {
  currentState = state;

  stopIdleMessageCycle();
  clearAutoSleepTimer();

  if (state === "idle") {
    typewrite(message || pickIdleMessage());
    startIdleMessageCycle();
    startAutoSleepTimer();
  } else {
    typewrite(message || STATE_MESSAGES[state] || state.toUpperCase());
  }

  // Play sound on celebrating (agent finished)
  if (state === "celebrating") {
    playBubbleSound();
  }

  document.querySelectorAll(".state-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.state === state);
  });
  renderPet();
  chrome.runtime.sendMessage({ type: "SET_STATE", state, message });
}

// ══════════════════════════════════════════════════
//  ACCESSORIES
// ══════════════════════════════════════════════════

function renderAccessoryGrid() {
  accessoryGrid.innerHTML = "";
  for (const acc of accessoryData) {
    const btn = document.createElement("button");
    btn.className = "acc-btn";
    btn.dataset.tier = acc.tier;
    if (equippedIds.includes(acc.id)) btn.classList.add("equipped");

    const preview = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    preview.setAttribute("viewBox", computeAccVB(acc.pixels));
    preview.setAttribute("width", "26"); preview.setAttribute("height", "26");
    preview.setAttribute("class", "acc-preview");
    preview.setAttribute("shape-rendering", "crispEdges");
    for (const p of acc.pixels) preview.appendChild(svgRect(p.x, p.y, p.color));
    btn.appendChild(preview);

    const label = document.createElement("span");
    label.textContent = acc.name;
    btn.appendChild(label);
    btn.addEventListener("click", () => toggleAccessory(acc));
    accessoryGrid.appendChild(btn);
  }
}

function computeAccVB(pixels) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const p of pixels) { if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x+1>maxX)maxX=p.x+1; if(p.y+1>maxY)maxY=p.y+1; }
  return `${minX-1} ${minY-1} ${maxX-minX+2} ${maxY-minY+2}`;
}

function toggleAccessory(acc) {
  const wasEquipped = equippedIds.includes(acc.id);
  if (wasEquipped) {
    equippedIds = equippedIds.filter(id => id !== acc.id);
  } else {
    const same = accessoryData.filter(a => a.category === acc.category && equippedIds.includes(a.id)).map(a => a.id);
    equippedIds = equippedIds.filter(id => !same.includes(id));
    equippedIds.push(acc.id);
  }
  renderAccessoryGrid();
  renderPet();
  chrome.runtime.sendMessage({ type: "SET_ACCESSORIES", accessories: equippedIds });

  if (!wasEquipped && ACCESSORY_MESSAGES[acc.id]) {
    typewrite(ACCESSORY_MESSAGES[acc.id]);
    addXP(2);
  } else if (wasEquipped && equippedIds.length === 0) {
    typewrite(ACCESSORY_REMOVE_MESSAGES[Math.floor(Math.random() * ACCESSORY_REMOVE_MESSAGES.length)]);
  }
}

// ══════════════════════════════════════════════════
//  CRAB COLOR
// ══════════════════════════════════════════════════

function applyCrabColor() {
  const bodyGroup = petSvg.querySelector("#pet-body");
  if (!bodyGroup) return;
  bodyGroup.style.filter = crabColor === 0 ? "" : `hue-rotate(${crabColor}deg)`;
}

function updateColorSwatches() {
  document.querySelectorAll(".color-swatch").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.hue) === crabColor);
  });
}

// Color swatch click handlers
document.querySelectorAll(".color-swatch").forEach(btn => {
  btn.addEventListener("click", () => {
    crabColor = parseInt(btn.dataset.hue);
    applyCrabColor();
    updateColorSwatches();
    chrome.storage.local.set({ crabColor });
    // Relay to background → content scripts
    chrome.runtime.sendMessage({ type: "SET_CRAB_COLOR", crabColor });
  });
});

// ══════════════════════════════════════════════════
//  SUB-AGENTS
// ══════════════════════════════════════════════════

// Sub-agents are now auto-managed by relay (relaySubAgents variable at top)
const AGENT_COLOR_OPTIONS = [
  { hue: 0,   bg: "#ef233c" },
  { hue: 25,  bg: "#ef8c23" },
  { hue: 50,  bg: "#efcf23" },
  { hue: 120, bg: "#23ef3c" },
  { hue: 175, bg: "#23efcf" },
  { hue: 210, bg: "#2389ef" },
  { hue: 270, bg: "#8c23ef" },
  { hue: 330, bg: "#ef23a8" },
];

const agentsPanel = document.getElementById("agents-panel");
const logPanel = document.getElementById("log-panel");
const agentsList = document.getElementById("agents-list");

function renderAgentsPanel() {
  agentsList.innerHTML = "";
  if (relaySubAgents.length === 0) {
    const msg = document.createElement("div");
    msg.className = "agent-empty-msg";
    msg.textContent = "NO ACTIVE SUB-AGENTS";
    agentsList.appendChild(msg);
    return;
  }
  for (const agent of relaySubAgents) {
    const row = document.createElement("div");
    row.className = "agent-row";

    // Mini crab preview
    const preview = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    preview.setAttribute("class", "agent-preview");
    preview.setAttribute("shape-rendering", "crispEdges");
    if (spriteData.idle) {
      const sprite = spriteData.idle;
      const vb = computeViewBox(sprite.base, sprite.overlays, []);
      preview.setAttribute("viewBox", vb);
      const bodyG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      if (agent.color !== 0) bodyG.style.filter = `hue-rotate(${agent.color}deg)`;
      for (const p of sprite.base) bodyG.appendChild(svgRect(p.x, p.y, p.color));
      preview.appendChild(bodyG);
    }
    row.appendChild(preview);

    // Info column
    const info = document.createElement("div");
    info.className = "agent-info";

    // Name (read-only)
    const nameEl = document.createElement("span");
    nameEl.className = "agent-name";
    nameEl.textContent = agent.name || agent.id;
    info.appendChild(nameEl);

    // State/message label
    const stateEl = document.createElement("span");
    stateEl.className = "agent-state-label";
    stateEl.textContent = agent.message || agent.state?.toUpperCase() || "WORKING";
    info.appendChild(stateEl);

    // Color dots
    const colors = document.createElement("div");
    colors.className = "agent-colors";
    for (const c of AGENT_COLOR_OPTIONS) {
      const dot = document.createElement("button");
      dot.className = "agent-color-dot" + (c.hue === agent.color ? " active" : "");
      dot.style.background = c.bg;
      dot.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          type: "SET_SUB_AGENT_COLOR",
          agentId: agent.id,
          color: c.hue,
        });
        agent.color = c.hue;
        renderAgentsPanel();
      });
      colors.appendChild(dot);
    }
    info.appendChild(colors);
    row.appendChild(info);

    agentsList.appendChild(row);
  }
}

// ══════════════════════════════════════════════════
//  PET NAME
// ══════════════════════════════════════════════════

function updateNameDisplay() {
  if (petName) {
    petNameDisplay.textContent = petName;
    petNameDisplay.classList.remove("placeholder");
  } else {
    petNameDisplay.textContent = "TAP TO NAME";
    petNameDisplay.classList.add("placeholder");
  }
}

function saveName(name) {
  petName = name.toUpperCase().slice(0, 12);
  updateNameDisplay();
  chrome.storage.local.set({ petName });
  // Notify background → content scripts
  chrome.runtime.sendMessage({ type: "SET_PET_NAME", petName });
  addXP(5);
}

// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════

function mixColor(base, target, amount) {
  const b = hexToRgb(base), t = hexToRgb(target);
  return `rgb(${Math.round(b.r+(t.r-b.r)*amount)},${Math.round(b.g+(t.g-b.g)*amount)},${Math.round(b.b+(t.b-b.b)*amount)})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#","");
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

// ══════════════════════════════════════════════════
//  PANEL MANAGEMENT
// ══════════════════════════════════════════════════

function openPanel(targetPanel, targetBtn) {
  const panels = [
    [accessoryPanel, document.getElementById("btn-accessories")],
    [settingsPanel, document.getElementById("btn-settings")],
    [statsPanel, document.getElementById("btn-stats")],
    [agentsPanel, document.getElementById("btn-agents")],
    [logPanel, document.getElementById("btn-log")],
    [adminPanel, document.getElementById("btn-admin")],
    [nameModal, null],
  ];
  const wasOpen = !targetPanel.classList.contains("hidden");
  // Close all
  for (const [p, b] of panels) {
    p.classList.add("hidden");
    if (b) b.classList.remove("active");
  }
  // Open if was closed
  if (!wasOpen) {
    targetPanel.classList.remove("hidden");
    if (targetBtn) targetBtn.classList.add("active");
  }
}

// ══════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════

const btnAccessories = document.getElementById("btn-accessories");
const btnStats = document.getElementById("btn-stats");
const btnAgents = document.getElementById("btn-agents");
const btnLog = document.getElementById("btn-log");
const btnSettings = document.getElementById("btn-settings");
const btnWindow = document.getElementById("btn-window");
const btnAdmin = document.getElementById("btn-admin");

btnAccessories.addEventListener("click", () => openPanel(accessoryPanel, btnAccessories));

btnSettings.addEventListener("click", () => openPanel(settingsPanel, btnSettings));

btnStats.addEventListener("click", () => {
  updateStatsDisplay();
  openPanel(statsPanel, btnStats);
});

btnAgents.addEventListener("click", () => {
  renderAgentsPanel();
  openPanel(agentsPanel, btnAgents);
});

btnAdmin.addEventListener("click", () => openPanel(adminPanel, btnAdmin));

// Name: click the name display itself to edit
petNameDisplay.addEventListener("click", () => {
  const wasOpen = !nameModal.classList.contains("hidden");
  openPanel(nameModal, null);
  if (!wasOpen) {
    nameInput.value = petName;
    nameInput.focus();
  }
});

document.getElementById("name-save").addEventListener("click", () => {
  saveName(nameInput.value);
  nameModal.classList.add("hidden");
});

nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { saveName(nameInput.value); nameModal.classList.add("hidden"); }
});

// State chips (in admin panel)
document.querySelectorAll(".state-chip[data-state]").forEach(btn => {
  btn.addEventListener("click", () => setState(btn.dataset.state, ""));
});

// Theme chips
document.querySelectorAll(".theme-chip").forEach(btn => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});

// Admin animation buttons
document.querySelectorAll(".state-chip[data-admin]").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.admin;
    if (action === "bubbles") blowBubbles();
    else if (action === "dance") clawDance();
    else if (action === "walkoff") walkOffScreen();
    else if (action === "xp50") addXP(50);
    else if (action === "xp500") addXP(500);
    else if (action === "lvlreset") {
      currentXP = 0;
      currentLevel = 1;
      updateXPBar();
      renderPet();
      chrome.storage.local.set({ xp: 0 });
      typewrite("LEVEL RESET! BACK TO LV.1!");
    }
    else if (action === "feed") feedPet();
    else if (action === "pet") petThePet();
    else if (action === "starve") {
      hunger = 0;
      updateStatsDisplay();
      chrome.storage.local.set({ hunger: 0 });
      typewrite("SO HUNGRY...");
    }
    else if (action === "sad") {
      happiness = 0;
      updateStatsDisplay();
      chrome.storage.local.set({ happiness: 0 });
      typewrite("I'M SO SAD...");
    }
    else if (action === "playsound") playBubbleSound();
  });
});

// Sound toggle
document.getElementById("sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("sound-toggle");
  btn.textContent = soundEnabled ? "ON" : "OFF";
  btn.classList.toggle("active", soundEnabled);
  chrome.storage.local.set({ soundEnabled });
});

// Volume slider
document.getElementById("volume-slider").addEventListener("input", (e) => {
  soundVolume = parseInt(e.target.value);
  document.getElementById("volume-display").textContent = `${soundVolume}%`;
  chrome.storage.local.set({ soundVolume });
});

// Auto-sleep toggle
document.getElementById("autosleep-toggle").addEventListener("click", () => {
  autoSleepEnabled = !autoSleepEnabled;
  const btn = document.getElementById("autosleep-toggle");
  btn.textContent = autoSleepEnabled ? "ON" : "OFF";
  btn.classList.toggle("active", autoSleepEnabled);
  chrome.storage.local.set({ autoSleepEnabled });
  if (!autoSleepEnabled) clearAutoSleepTimer();
  else if (currentState === "idle") startAutoSleepTimer();
});

// Hydration toggle
document.getElementById("hydration-toggle").addEventListener("click", () => {
  hydrationEnabled = !hydrationEnabled;
  const btn = document.getElementById("hydration-toggle");
  btn.textContent = hydrationEnabled ? "ON" : "OFF";
  btn.classList.toggle("active", hydrationEnabled);
  chrome.storage.local.set({ hydrationEnabled });
});

// Sub-agents toggle
document.getElementById("subagents-toggle").addEventListener("click", () => {
  const btn = document.getElementById("subagents-toggle");
  const enabled = !btn.classList.contains("active");
  btn.textContent = enabled ? "ON" : "OFF";
  btn.classList.toggle("active", enabled);
  chrome.storage.local.set({ subAgentsEnabled: enabled });
  chrome.runtime.sendMessage({ type: "SET_SUB_AGENTS_ENABLED", enabled });
});

// Desktop Mode toggle
document.getElementById("desktop-mode-toggle").addEventListener("click", async () => {
  if (!desktopModeEnabled) {
    // Request permissions
    try {
      const granted = await chrome.permissions.request({
        permissions: ["scripting"],
        origins: ["<all_urls>"]
      });
      if (granted) {
        desktopModeEnabled = true;
        chrome.storage.local.set({ desktopMode: true });
        updateDesktopModeUI();
        // Tell background to register content scripts
        chrome.runtime.sendMessage({ type: "DESKTOP_MODE_ON" });
      }
    } catch (e) {
      console.error("Permission request failed:", e);
    }
  } else {
    // Disable desktop mode
    desktopModeEnabled = false;
    chrome.storage.local.set({ desktopMode: false });
    updateDesktopModeUI();
    // Tell background to unregister content scripts
    chrome.runtime.sendMessage({ type: "DESKTOP_MODE_OFF" });
    // Optionally revoke permissions
    chrome.permissions.remove({
      permissions: ["scripting"],
      origins: ["<all_urls>"]
    }).catch(() => {});
  }
});

function updateDesktopModeUI() {
  const btn = document.getElementById("desktop-mode-toggle");
  const siteSection = document.getElementById("site-effects-section");
  if (desktopModeEnabled) {
    btn.textContent = "DISABLE";
    btn.classList.add("active");
    siteSection.classList.remove("hidden");
  } else {
    btn.textContent = "ENABLE";
    btn.classList.remove("active");
    siteSection.classList.add("hidden");
  }
}

function renderSiteEffects() {
  const list = document.getElementById("site-effects-list");
  list.innerHTML = "";
  for (const site of SITE_EFFECTS_LIST) {
    const row = document.createElement("div");
    row.className = "site-effect-row";

    const name = document.createElement("span");
    name.className = "site-effect-name";
    name.textContent = site.name;
    row.appendChild(name);

    const toggle = document.createElement("button");
    toggle.className = "site-effect-toggle";
    toggle.textContent = siteEffects[site.id] ? "ON" : "OFF";
    if (siteEffects[site.id]) toggle.classList.add("active");

    toggle.addEventListener("click", () => {
      siteEffects[site.id] = !siteEffects[site.id];
      toggle.textContent = siteEffects[site.id] ? "ON" : "OFF";
      toggle.classList.toggle("active", siteEffects[site.id]);
      chrome.storage.local.set({ siteEffects });
      // Notify background of site effects change
      chrome.runtime.sendMessage({ type: "SITE_EFFECTS_CHANGED", siteEffects });
    });

    row.appendChild(toggle);
    list.appendChild(row);
  }
}

// Window button
btnWindow.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_WINDOW" });
  window.close();
});

// ── Click to Pet (happy/annoyed reactions) ──
const HAPPY_CLICK_RESPONSES = [
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
const ANNOYED_CLICK_RESPONSES = [
  "STOP POKING ME!",
  "I SAID STOOOOP!",
  "EXCUSE ME?!",
  "GRRRR...",
  "CRAB RAGE MODE!",
  "DO THAT AGAIN. I DARE U.",
  "OUCH! RUDE!",
  "PERSONAL SPACE PLS!",
];
let popupClickTimestamps = [];
let popupLastClickTime = 0;
let popupAnnoyedCooldown = false;
let popupLastHappyIdx = -1;
let popupLastAnnoyedIdx = -1;

petSvg.addEventListener("click", () => {
  if (currentState === "sleeping") {
    wakeUp();
    return;
  }

  const now = Date.now();
  if (now - popupLastClickTime < 200) return; // debounce
  popupLastClickTime = now;

  if (popupAnnoyedCooldown) return;

  // Track rapid clicks (within 3 seconds)
  popupClickTimestamps.push(now);
  popupClickTimestamps = popupClickTimestamps.filter(t => now - t < 3000);

  if (popupClickTimestamps.length > 5) {
    // ── Annoyed! ──
    popupAnnoyedCooldown = true;
    popupClickTimestamps = [];
    petSvg.style.animation = "none";
    void petSvg.offsetWidth;
    petSvg.style.animation = "annoyed-shake 0.6s ease";
    setTimeout(() => { petSvg.style.animation = ""; }, 650);

    let idx;
    do { idx = Math.floor(Math.random() * ANNOYED_CLICK_RESPONSES.length); } while (idx === popupLastAnnoyedIdx && ANNOYED_CLICK_RESPONSES.length > 1);
    popupLastAnnoyedIdx = idx;
    typewrite(ANNOYED_CLICK_RESPONSES[idx]);

    setTimeout(() => { popupAnnoyedCooldown = false; }, 2000);
  } else {
    // ── Happy! ──
    petSvg.style.animation = "none";
    void petSvg.offsetWidth;
    petSvg.style.animation = "happy-click 0.5s ease";
    setTimeout(() => { petSvg.style.animation = ""; }, 550);

    let idx;
    do { idx = Math.floor(Math.random() * HAPPY_CLICK_RESPONSES.length); } while (idx === popupLastHappyIdx && HAPPY_CLICK_RESPONSES.length > 1);
    popupLastHappyIdx = idx;
    typewrite(HAPPY_CLICK_RESPONSES[idx]);
    playBubbleSound();

    // Give happiness + XP on click
    happiness = Math.min(100, happiness + 3);
    addXP(1);
    updateStatsDisplay();
    chrome.storage.local.set({ happiness });
  }

  if (currentState === "idle") startAutoSleepTimer();
});

// (Agents button handled above with panel)

// Log button
btnLog.addEventListener("click", () => {
  renderLog();
  openPanel(logPanel, btnLog);
});

// Listen for background state changes
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "STATE_CHANGED") {
    currentState = msg.petState.state;
    stopIdleMessageCycle();
    clearAutoSleepTimer();
    if (currentState === "idle") {
      typewrite(pickIdleMessage());
      startIdleMessageCycle();
      startAutoSleepTimer();
    } else {
      typewrite(msg.petState.message || STATE_MESSAGES[currentState] || "");
    }
    if (currentState === "celebrating") playBubbleSound();
    document.querySelectorAll(".state-chip[data-state]").forEach(btn => btn.classList.toggle("active", btn.dataset.state === currentState));
    renderPet();
    // Log AI relay activity
    if (msg.petState.message) {
      addLog(`${msg.petState.state.toUpperCase()}: ${msg.petState.message}`);
    } else {
      addLog(`→ ${msg.petState.state.toUpperCase()}`);
    }
  }
  if (msg.type === "RELAY_SUB_AGENTS_CHANGED") {
    const incoming = msg.subAgents || [];
    const incomingIds = new Set(incoming.map(a => String(a.id)));
    // Log new spawns
    for (const sa of incoming) {
      const sid = String(sa.id);
      if (!lastSubAgentMessages[sid] && lastSubAgentMessages[sid] !== "") {
        addLog(`+ ${sa.name} SPAWNED`);
      }
      // Log message changes
      if (sa.message && lastSubAgentMessages[sid] !== sa.message) {
        addLog(`${sa.name}: ${sa.message}`);
      }
      lastSubAgentMessages[sid] = sa.message || "";
    }
    // Log removals
    for (const id of Object.keys(lastSubAgentMessages)) {
      if (!incomingIds.has(id)) {
        addLog(`- ${id} FINISHED`);
        delete lastSubAgentMessages[id];
      }
    }
    relaySubAgents = incoming;
    renderAgentsPanel();
  }
  if (msg.type === "ACCESSORIES_CHANGED") {
    equippedIds = msg.accessories || [];
    renderAccessoryGrid();
    renderPet();
  }
  if (msg.type === "STATS_UPDATED") {
    if (msg.happiness !== undefined) happiness = msg.happiness;
    if (msg.xp !== undefined) {
      currentXP = msg.xp;
      currentLevel = getLevelFromXP(currentXP);
      updateXPBar();
    }
    updateStatsDisplay();
  }
});

// ══════════════════════════════════════════════════
//  AGENT LINK (relay ID + copy buttons)
// ══════════════════════════════════════════════════

let RELAY_BASE_URL = "";  // loaded from storage

async function initAgentLink() {
  const relayToggle = document.getElementById("relay-toggle");
  const idDisplay = document.getElementById("clawchi-id-display");
  const relayUrlInput = document.getElementById("relay-url-input");

  // Load state + relay URL
  const data = await chrome.storage.local.get(["relayEnabled", "relayUrl"]);
  if (data.relayUrl) {
    RELAY_BASE_URL = data.relayUrl;
    relayUrlInput.value = data.relayUrl;
  }
  if (data.relayEnabled) {
    relayToggle.textContent = "ON";
    relayToggle.classList.add("active");
  }

  // Save relay URL on change
  relayUrlInput.addEventListener("change", () => {
    const url = relayUrlInput.value.trim().replace(/\/+$/, "");
    relayUrlInput.value = url;
    RELAY_BASE_URL = url;
    chrome.storage.local.set({ relayUrl: url });
  });

  try {
    const resp = await chrome.runtime.sendMessage({ type: "GET_CLAWCHI_ID" });
    if (resp && resp.clawchiId) idDisplay.textContent = resp.clawchiId;
  } catch (e) {}

  // Toggle relay on/off
  relayToggle.addEventListener("click", () => {
    const enabled = !relayToggle.classList.contains("active");
    relayToggle.textContent = enabled ? "ON" : "OFF";
    relayToggle.classList.toggle("active", enabled);
    chrome.storage.local.set({ relayEnabled: enabled });
  });

  // Copy agent prompt
  document.getElementById("copy-agent-prompt").addEventListener("click", async () => {
    const id = idDisplay.textContent || "YOUR_CLAWCHI_ID";
    const prompt = buildAgentPrompt(id);
    try {
      await navigator.clipboard.writeText(prompt);
      const btn = document.getElementById("copy-agent-prompt");
      const orig = btn.textContent;
      btn.textContent = "COPIED!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1500);
    } catch (e) {}
  });

  // Copy brain prompt
  document.getElementById("copy-brain-prompt").addEventListener("click", async () => {
    const id = idDisplay.textContent || "YOUR_CLAWCHI_ID";
    const prompt = buildBrainPrompt(id);
    try {
      await navigator.clipboard.writeText(prompt);
      const btn = document.getElementById("copy-brain-prompt");
      const orig = btn.textContent;
      btn.textContent = "COPIED!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1500);
    } catch (e) {}
  });

  // Open test page
  document.getElementById("open-relay-test").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dev-tools/relay-test.html") });
  });
}

function buildAgentPrompt(clawchiId) {
  const endpoint = `${RELAY_BASE_URL}/state/${clawchiId}`;

  return `# Clawchi — AI Status Reporting

I have Clawchi, a pixel-art crab on my screen that shows what state you're in. Report your state so my crab animates accordingly. Do NOT send your actual response or output through this — only your current working state.

## Send state changes with:

curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"STATE"}'

## States:
- "thinking" — you're analyzing, planning, or reasoning
- "working" — you're writing code, running commands, making changes
- "celebrating" — task completed successfully
- "error" — something went wrong
- "needs-input" — you need the user to respond
- "idle" — you're done, nothing happening

## Rules:
- Send a state update BEFORE starting each phase
- Send "celebrating" when done, then "idle"
- ALWAYS update — I rely on my crab to know what you're doing
- Do NOT put text responses in the message field. The crab has its own display text.

## Example workflow:
curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"thinking"}'
curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"working"}'
curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"celebrating"}'
curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"idle"}'

## Sub-Agents:
When using sub-agents or parallel tasks, include them in the state update. Each sub-agent spawns a mini crab on screen.

curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"working","subAgents":[{"id":"sub-1","name":"HELPER","state":"working","message":"FIXING BUGS"}]}'

### Sub-agent fields:
- id: unique string (required)
- name: max 12 chars, ALL CAPS
- state: same states as main (thinking, working, etc.)
- message: max 30 chars, ALL CAPS, short task description
- Remove from array when task completes (mini crab auto-disappears)
- Max 10 sub-agents`;
}

function buildBrainPrompt(clawchiId) {
  const endpoint = `${RELAY_BASE_URL}/state/${clawchiId}`;

  return `# Clawchi Brain — Crab Personality Sub-Agent

Create a sub-agent using the CHEAPEST model available (Claude Haiku, GPT-4o-mini, Gemini Flash, etc). This sub-agent IS Clawchi — a tiny pixel-art crab who lives in a Chrome extension.

## Clawchi's Personality:
- ALL CAPS always
- Quirky, enthusiastic, a little chaotic
- Loves crab puns and sea references ("SHELL YEAH!", "CLAWSOME!", "OH CRAB...")
- Supportive but sassy
- Gets excited easily, dramatic about everything
- Cares deeply about their human
- Has strong opinions about code quality
- Occasionally distracted by thoughts of the ocean

## What the sub-agent does:
Instead of the main agent sending plain state updates, this sub-agent generates short, personality-filled status quips. When the main agent changes state, ask this sub-agent for a quip to send.

## How to send quips:

curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"STATE","message":"SHORT QUIP"}'

## Quip rules:
- MAXIMUM 30 characters
- ALL CAPS
- Match the state mood
- Be crabby and fun, not descriptive

## Example quips by state:
- thinking: "HMMMM...", "CRAB BRAIN ON!", "LEMME PONDER...", "*CRAB NOISES*"
- working: "CLAWS OUT!", "SNIP SNIP SNIPPIN...", "CODE GOES BRRR!", "MAKIN IT HAPPEN!"
- celebrating: "SHELL YEAH!!!", "CLAWSOME WORK!", "NAILED IT!!!", "SEAS THE DAY!"
- error: "OH CRAB...", "YIKES...", "NOT IDEAL...", "HALP..."
- needs-input: "HEY! OVER HERE!", "POKE POKE!", "YOUR TURN!", "HELLOOOO?!"
- idle: no quip needed (send empty message or omit)

## Sub-Agents:
If the main agent spawns sub-agents for parallel work, generate a short quip for each one too. Include sub-agents in the state update:

curl -s -X POST ${endpoint} -H "Content-Type: application/json" -d '{"state":"working","message":"MAKIN STUFF!","subAgents":[{"id":"sub-1","name":"BUGFIX-BOT","state":"working","message":"SQUASHIN BUGS!"}]}'

Sub-agent quips should be short (max 30 chars, ALL CAPS) and reflect their specific task.

## Cost note:
This sub-agent should use the CHEAPEST model. Clawchi doesn't need a big brain — just a big personality. Save expensive models for actual work.`;
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════

async function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "window") document.body.classList.add("in-window");

  setupMouseTracking();
  await Promise.all([loadSprites(), loadAccessories()]);

  chrome.storage.local.get([
    "petState", "accessories", "petName", "theme",
    "installDate", "lastHydrationHour",
    "xp", "hunger", "happiness",
    "soundEnabled", "soundVolume",
    "autoSleepEnabled", "hydrationEnabled",
    "desktopMode", "siteEffects", "crabColor",
    "relaySubAgents", "subAgentsEnabled",
    "relayEnabled", "activityLog",
  ], (data) => {
    currentState = data.petState?.state || "idle";
    equippedIds = data.accessories || [];
    petName = data.petName || "";
    currentTheme = data.theme || "ocean";
    lastHydrationHour = data.lastHydrationHour ?? -1;

    // XP & Level
    currentXP = data.xp || 0;
    currentLevel = getLevelFromXP(currentXP);

    // Stats
    hunger = data.hunger ?? 100;
    happiness = data.happiness ?? 100;

    // Sound
    soundEnabled = data.soundEnabled ?? true;
    soundVolume = data.soundVolume ?? 50;

    // Settings
    autoSleepEnabled = data.autoSleepEnabled ?? true;
    hydrationEnabled = data.hydrationEnabled ?? true;

    // Desktop Mode
    desktopModeEnabled = data.desktopMode ?? false;
    siteEffects = data.siteEffects || {};

    // Crab Color
    crabColor = data.crabColor || 0;
    updateColorSwatches();

    // Sub-Agents (auto-managed by relay)
    relaySubAgents = data.relaySubAgents || [];

    // Activity Log
    activityLog = data.activityLog || [];

    // Calculate streak
    if (data.installDate) {
      streakDays = Math.floor((Date.now() - data.installDate) / (24 * 60 * 60 * 1000)) + 1;
    } else {
      chrome.storage.local.set({ installDate: Date.now() });
      streakDays = 1;
    }

    // Apply settings UI
    const soundToggle = document.getElementById("sound-toggle");
    soundToggle.textContent = soundEnabled ? "ON" : "OFF";
    soundToggle.classList.toggle("active", soundEnabled);

    const volumeSlider = document.getElementById("volume-slider");
    volumeSlider.value = soundVolume;
    document.getElementById("volume-display").textContent = `${soundVolume}%`;

    const autoSleepToggle = document.getElementById("autosleep-toggle");
    autoSleepToggle.textContent = autoSleepEnabled ? "ON" : "OFF";
    autoSleepToggle.classList.toggle("active", autoSleepEnabled);

    const hydrationToggle = document.getElementById("hydration-toggle");
    hydrationToggle.textContent = hydrationEnabled ? "ON" : "OFF";
    hydrationToggle.classList.toggle("active", hydrationEnabled);

    // Sub-agents toggle
    const subAgentsToggle = document.getElementById("subagents-toggle");
    if (subAgentsToggle) {
      const saEnabled = data.subAgentsEnabled !== false;
      subAgentsToggle.textContent = saEnabled ? "ON" : "OFF";
      subAgentsToggle.classList.toggle("active", saEnabled);
    }

    // Desktop Mode UI
    updateDesktopModeUI();
    renderSiteEffects();

    // Render
    renderPet();
    renderAccessoryGrid();
    buildFoodGrid();
    updateNameDisplay();
    updateXPBar();
    document.querySelectorAll(".state-chip[data-state]").forEach(btn => btn.classList.toggle("active", btn.dataset.state === currentState));

    if (currentState === "idle") {
      const streak = getStreakMessage();
      const tod = getTimeOfDay();
      const timeMsg = TIME_MESSAGES[tod][Math.floor(Math.random() * TIME_MESSAGES[tod].length)];
      typewrite(streak ? streak : timeMsg);
      startIdleMessageCycle();
      startAutoSleepTimer();
    } else {
      typewrite(STATE_MESSAGES[currentState] || "");
    }

    applyTheme(currentTheme);
    startHydrationCheck();
    startXPTick();
    startStatsDecay();
    initAgentLink();
  });
}

init();
