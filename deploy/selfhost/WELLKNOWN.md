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
| 404 JSON `Configuration missing` | `IOS_*` / `ANDROID_*` not in running Core — set via bootstrap, recreate |
| 200 + `appIDs` / `components` | AASA OK |
| Wrong host (`links-dash…`) | Dashboard has no AASA — use shortlink domain |

## iOS still opens App Store / not app

1. AASA must be 200 on **shortlink** host with correct Team ID + Bundle ID.
2. Xcode Associated Domains: `applinks:links.example.com` (exact host).
3. Link fields:
   - **App scheme** = `myapp` (required for interstitial fallback)
   - **iOS universal link** = `https://links…/…` — **never** `apps.apple.com`
   - **iOS App Store URL** = store listing only
4. After AASA change, iOS caches hard — delete app, reboot, or wait; Apple CDN can take hours.
5. First tap from Notes/iMessage opens app when UL works; paste into Safari often stays in browser (iOS behavior).
6. Core never auto-jumps to App Store anymore when scheme is set — only the Download button.

## Android still opens Play

1. Working `assetlinks.json` + Play App Signing fingerprint.
2. Set **Android app link** (https shortlink host), **App scheme**, `ANDROID_PACKAGE_NAME`.
3. No auto Play redirect when scheme/intent is used.
