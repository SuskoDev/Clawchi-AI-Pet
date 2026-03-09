# Security Policy

## Permissions

Clawchi requests minimal Chrome permissions:

| Permission | Why |
|-----------|-----|
| `storage` | Save your crab's settings, XP, accessories, and relay config locally |
| `sidePanel` | Optional side panel view |

### Optional permissions (only requested when needed):
| Permission | Why |
|-----------|-----|
| `tabs` | Desktop mode — inject the crab overlay onto web pages |
| `notifications` | Hydration reminders |
| `scripting` | Desktop mode injection |

## What Clawchi Does NOT Do

- Does NOT read your browsing history
- Does NOT access your bookmarks, passwords, or autofill data
- Does NOT inject ads or trackers
- Does NOT send any data to third parties
- Does NOT collect analytics or telemetry
- Does NOT modify any web page content (the crab overlay is isolated in a Shadow DOM)

## Data Flow

```
Your AI Agent  ──POST──>  Your Cloudflare Relay  ──poll──>  Extension  ──>  Crab animates
```

- **You deploy your own relay** — no shared server, your data stays on your Cloudflare account
- The relay stores only: crab state (idle/thinking/working), a short message, and a random anonymous ID
- All relay data **auto-expires after 5 minutes**
- The extension polls your relay every 1.5 seconds via a simple GET request

## Local Storage Only

All pet data (XP, level, accessories, settings) is stored in `chrome.storage.local` — it never leaves your browser.

## How to Verify

This project is 100% open source with zero dependencies:

1. **Read the code** — there are no minified bundles, no node_modules, no build step. What you see is what runs.
2. **Check the manifest** — `manifest.json` lists every permission. Compare it to what's documented above.
3. **Inspect network requests** — the only outbound request is the relay poll to YOUR Cloudflare Worker URL.
4. **Check the worker** — `cloudflare-worker/worker.js` is ~100 lines. It does nothing except store and return JSON.

## Reporting a Vulnerability

If you find a security issue, please **do not** open a public issue. Instead, email the maintainer or open a private security advisory on GitHub.

We take security seriously and will respond promptly.

## Supply Chain

- **Zero npm dependencies** in the extension itself
- **No build step** — the source files ARE the extension
- **No CDN imports** — only Google Fonts (Press Start 2P) loaded via CSS
- **Cloudflare Worker** uses only the built-in Workers runtime (no npm packages)
