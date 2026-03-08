# Deploy Your Clawchi Relay

## 1. Install Wrangler (if you don't have it)
```bash
npm install -g wrangler
```

## 2. Login to Cloudflare
```bash
wrangler login
```

## 3. Create a KV namespace
```bash
wrangler kv namespace create CLAWCHI_KV
```
Copy the `id` from the output and paste it into `wrangler.toml` replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

## 4. Deploy
```bash
wrangler deploy
```

## 5. Done
Your relay is now live at: `https://clawchi-relay.YOUR_SUBDOMAIN.workers.dev`

Paste that URL into the Clawchi extension settings under AGENT LINK > RELAY URL.

## Optional: Add auth
Uncomment `AUTH_KEY` in `wrangler.toml` and set a secret. Your AI agent prompt will need to include `Authorization: Bearer YOUR_KEY` in requests.
