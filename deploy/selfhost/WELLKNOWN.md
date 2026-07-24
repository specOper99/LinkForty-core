# Self-host ops: .well-known + store fallback

## Probe (shortlink host only — not dashboard)

```bash
curl -sS -D- https://links.example.com/.well-known/apple-app-site-association | head -40
curl -sS -D- https://links.example.com/apple-app-site-association | head -40
curl -sS -D- https://links.example.com/.well-known/assetlinks.json | head -40

docker compose -f docker-compose.selfhost.yml exec linkforty \
  sh -c 'echo TEAM=$IOS_TEAM_ID BUNDLE=$IOS_BUNDLE_ID PKG=$ANDROID_PACKAGE_NAME'
```

| Result | Meaning |
|---|---|
| 404 JSON `Configuration missing` | `IOS_*` / `ANDROID_*` not in running Core — set via bootstrap mobile prompts or `.env`, recreate |
| 200 + valid JSON | File OK; if store still opens, fix app Associated Domains / intent-filters for this host |
| Wrong host (`links-dash…`) | Dashboard has no AASA — use shortlink domain |

`bootstrap.sh` runs these probes automatically after deploy when mobile env is present.

## Always opens store with app installed

1. If `.well-known` fails, OS never claims the HTTPS shortlink → browser hits Core.
2. With `appScheme`, Core shows interstitial: try scheme, then store after 2.5s.
3. Store timer cancels on `visibilitychange` / `pagehide` / `blur` when the app opens.
4. Prefer working Universal/App Links so the OS opens the app without loading Core.
