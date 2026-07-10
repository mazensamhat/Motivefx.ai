# MotiveFX mobile store assets

Generated from the official brand mark:

`apps/site/public/brand/motivefx-icon.png`

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 | iOS + Expo / Play icon |
| `adaptive-icon.png` | 1024×1024 | Android adaptive foreground (extra padding) |
| `splash-icon.png` | 1024×1024 | Splash screen logo |
| `motivefx-brand-source.png` | source copy | Reference |

Regenerate after updating the brand file:

```bash
pnpm mobile:assets
# or
node scripts/generate-mobile-assets.mjs
```

Then rebuild both platforms so home-screen icons update:

```bash
eas build --platform ios --profile production
eas build --platform android --profile preview
```
