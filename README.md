<p align="center">
  <img src="icons/icon128.png" alt="Clawchi" width="128" height="128" style="image-rendering: pixelated;">
</p>

<h1 align="center">Clawchi</h1>

<p align="center">
  <strong>Your AI agent's pixel-art crab companion.</strong><br>
  A Tamagotchi-style Chrome extension that shows what your AI is doing in real time.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/version-0.1.0-red?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/pixel_art-crab-ef233c?style=flat-square" alt="Pixel Art Crab">
</p>

---

## What is Clawchi?

Clawchi is a tiny pixel-art crab that lives in your browser. Connect it to your AI coding agent (Cursor, Claude Code, Copilot, etc.) and watch it react in real time - thinking, working, celebrating, sleeping. It's the status bar you never knew you needed, but now can't live without.

**No data collection. No tracking. Just vibes.**

## Features

- **Live AI Status** - Your crab animates based on what your AI agent is doing (thinking, working, celebrating, error, needs input)
- **Desktop Mode** - The crab walks around on every web page you visit
- **Sub-Agents** - Mini crabs auto-spawn when your AI runs parallel tasks
- **Drag & Drop Feeding** - Drag pixel-art food (burger, sushi, pizza, etc.) onto your crab
- **XP & Levels** - Your crab levels up the more you interact with it
- **Accessories** - 18 equippable items: top hat, crown, sunglasses, wizard hat, gold chain, angel wings, and more
- **Custom Colors** - 8 crab color options via hue-rotate
- **Hydration Reminders** - Your crab reminds you to drink water
- **Time-of-Day Awareness** - Different messages for morning, afternoon, night, and 3am coding sessions
- **Rare Animations** - Random bubble blowing, claw dances, and walk-offs
- **Activity Log** - Track your AI's state changes and sub-agent activity
- **Streak Tracking** - See how many days you and your crab have been together
- **Optional Brain Prompt** - Give your crab its own personality using a cheap AI model
- **Sound Effects** - Bubble pop SFX with volume control
- **3 Themes** - Ocean, Beach, Night backgrounds
- **Click Interactions** - Happy reactions when you click, annoyed if you spam

## How It Works

```
Your AI Agent  ──POST──>  Cloudflare Relay  ──poll──>  Chrome Extension  ──>  Crab Animates!
```

1. Copy the **Agent Prompt** from Clawchi settings into your AI tool
2. Your AI sends state updates (`thinking`, `working`, `celebrating`, etc.) to the Clawchi relay
3. The extension polls every 1.5 seconds and updates your crab's animation
4. That's it. Your crab now reflects what your AI is doing.

## Installation

### From Source (Developer)

1. Clone this repo:
   ```bash
   git clone https://github.com/molanga183/clawchi.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the cloned folder
5. Click the Clawchi icon in your toolbar

### Connect to Your AI

1. Open Clawchi popup > **Settings** > scroll to **Agent Link**
2. Toggle the relay **ON**
3. Click **COPY AGENT PROMPT** and paste it into your AI tool's system prompt or rules
4. (Optional) Click **COPY BRAIN PROMPT** for crab personality quips

## Tech Stack

- **Chrome Extension** - Manifest V3, vanilla JS, no frameworks
- **Pixel Art** - Hand-crafted 40x36 sprites with per-pixel animations
- **Cloudflare Worker** - Lightweight relay server with KV storage (auto-expires after 5 min)
- **Shadow DOM** - Desktop overlay isolated from page styles
- **Press Start 2P** - Pixel-perfect Google Font

## Project Structure

```
clawchi/
  manifest.json        # Extension config (MV3)
  background.js        # Service worker: state management, relay polling
  content.js           # Desktop overlay: crab rendering, walking, dragging
  popup.html           # Popup UI structure
  popup.js             # Popup logic: stats, accessories, settings, food
  popup.css            # All popup styles
  icons/               # Extension icons (16, 48, 128px)
  sprites/             # Pixel art JSON sprites
    idle.json          # Default crab pose
    thinking.json      # Thinking animation
    working.json       # Working animation
    sleeping.json      # Sleeping animation (with Z's)
    accessories/       # 18 equippable accessory sprites
    food/              # 7 drag-and-drop food items
  cloudflare-worker/   # Relay server
    worker.js          # Cloudflare Worker source
    wrangler.toml      # Deployment config
```

## Privacy

Clawchi does not read, collect, or transmit any browsing data. Ever.

- The Desktop Mode overlay is purely visual (a crab walking on your screen)
- The relay only stores your crab's state (idle/thinking/working) with a random anonymous ID
- All state data auto-expires after 5 minutes
- No analytics, no tracking, no cookies
- Fully open source - read every line yourself

## Contributing

PRs welcome! Whether it's new accessories, animations, food items, or features.

## License

MIT

---

<p align="center">
  <sub>made with claw-ve by the clawchi team</sub>
</p>
