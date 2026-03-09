# Changelog

All notable changes to Clawchi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-09

### Added
- Initial release of Clawchi Chrome extension
- Live AI status relay — connects to your AI coding agent via Cloudflare Worker
- 5 animated states: thinking, working, celebrating, error, needs-input
- Desktop mode with walking crab overlay on all web pages
- Sub-agent system — mini crabs auto-spawn from relay when AI runs parallel tasks
- Drag & drop food feeding with munching animation (7 food items)
- XP and leveling system with streak tracking
- 18 equippable pixel-art accessories (crown, wizard hat, sunglasses, gold chain, etc.)
- 8 crab color customization options
- Hydration reminder system
- Time-of-day awareness with contextual messages
- Rare animations (bubble blowing, claw dance, walk-off)
- Activity log tracking AI state changes and sub-agent activity
- Optional Brain Prompt for crab personality via cheap AI model
- Sound effects with volume control
- 3 popup themes: Ocean, Beach, Night
- Click interactions with happy/annoyed reactions
- Full drag support for main crab and sub-agents (2D positioning)
- Cloudflare Worker relay server with KV storage (auto-expires after 5 min)
- Self-hosted relay — each user deploys their own
- Configurable relay URL in extension settings
- Dev tools: sprite anatomy viewer, animation tester, relay tester

### Security
- Zero external dependencies in extension code
- No data collection, tracking, or analytics
- All pet data stored locally in chrome.storage.local
- Relay data auto-expires after 5 minutes
- Shadow DOM isolation for desktop overlay
