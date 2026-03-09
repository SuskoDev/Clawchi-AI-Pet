# Contributing to Clawchi

Thanks for your interest in contributing to Clawchi! Whether it's a bug report, new feature, accessory sprite, or documentation fix — every contribution helps.

## Getting Started

1. Fork the repo and clone it locally
2. Load the extension in Chrome (`chrome://extensions` > Developer mode > Load unpacked)
3. Make your changes
4. Test that the extension loads and works correctly
5. Submit a pull request

## What You Can Contribute

### Accessories
Add new pixel-art accessories to `sprites/accessories/`. Each accessory is a JSON file with a pixel grid. Look at existing ones like `crown.json` or `sunglasses.json` for the format.

### Food Items
Add new food PNG sprites to `sprites/food/`. Keep them small (around 16x16 pixels) and pixel-art style.

### Animations
Improve or add new animation states. The crab sprites live in `sprites/` as JSON files.

### Bug Fixes
Found a bug? Open an issue first, then submit a PR with the fix.

### Features
Have an idea? Open an issue to discuss it before building. This helps avoid duplicate work.

## Code Style

- Vanilla JavaScript only (no frameworks, no build step)
- Keep functions small and well-named
- Comment non-obvious logic
- Test in Chrome before submitting

## File Structure

| File | Purpose |
|------|---------|
| `popup.js` | Extension popup UI logic |
| `popup.html` | Popup HTML structure |
| `popup.css` | All popup styles |
| `content.js` | Desktop overlay (crab on web pages) |
| `background.js` | Service worker, state management, relay polling |
| `cloudflare-worker/worker.js` | Relay server |

## Pull Request Guidelines

- Keep PRs focused on a single change
- Describe what you changed and why
- Include screenshots for visual changes
- Make sure the extension still loads without errors

## Reporting Bugs

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Chrome version
- Steps to reproduce

## Questions?

Open an issue with the `question` label and we'll help out.
