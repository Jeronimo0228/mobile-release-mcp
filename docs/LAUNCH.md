# LinkedIn launch kit

Draft copy for the **definitive** StorePilot post. Adjust tone to your voice before publishing.

## Before you post

- [ ] README golden path live on GitHub
- [ ] Run live demo via [DEMO.md](./DEMO.md) (`npm run demo` or `scripts/demo-storepilot.sh`)
- [ ] 1 colleague runs `scripts/try-storepilot.sh` and files feedback
- [ ] npm `@latest` ≥ 1.1.0 (`storepilot-mcp`)

## Hook options (pick one)

1. **Problem:** “My agent kept guessing whether we could ship to App Store and Play. I built StorePilot so it *shows blockers first*.”
2. **Demo:** “`storepilot snapshot` → iOS missing build, Android on internal. One MCP, both stores.”
3. **Safety:** “Release automation that defaults to **dry-run**, not production clicks.”

## Post draft (ES)

---

🚀 **StorePilot v1 — MCP para releases iOS + Android con agentes de IA**

Durante meses usé scripts sueltos y la consola de Apple/Google. Con Cursor/Claude el problema no es “¿hay API?” — es **¿puede mi agente saber si estamos listos para publicar sin romper producción?**

Por eso construí **StorePilot** (`storepilot-mcp` en npm):

✅ **Un snapshot** — producción vs candidato en iOS y Android  
✅ **Blockers explicados** — “falta build”, “track internal”, etc.  
✅ **Intents con dry-run** — `execute_release_intent` planifica antes de escribir  
✅ **storepilot.yaml** — el agente recuerda tu app, no re-pregunta IDs  
✅ **Webhooks EAS/GitHub** — CI → agente → tiendas  

No reemplaza Fastlane/EAS (build). Orquesta **store ops** con guardrails.

**Probar (5 min, sin escribir en tiendas):**
```bash
npx -y storepilot-mcp@latest
# + storepilot.yaml — ver README
```

📦 npm: https://www.npmjs.com/package/storepilot-mcp  
📖 GitHub: https://github.com/Jeronimo0228/StorePilot  
🎬 Demo: `scripts/demo-storepilot.sh`

Early v1 — busco feedback de equipos mobile + MCP.  
¿Usas agentes para releases? Comenta 👇

#MobileDev #iOS #Android #MCP #AI #DevTools #ReactNative #Flutter

---

## Post draft (EN)

---

🚀 **StorePilot v1 — MCP release orchestration for App Store + Google Play**

AI agents are great at code. They're risky at **production store ops** unless they know what's blocking release.

**StorePilot** (`storepilot-mcp` on npm) gives agents:

✅ Cross-platform **release snapshot**  
✅ **Explained blockers** + next actions  
✅ **Dry-run by default** workflows (`execute_release_intent`)  
✅ **`storepilot.yaml`** project profile + memory  
✅ **EAS/GitHub webhooks** for CI-driven releases  

Complements Fastlane/EAS (build) — focuses on **store orchestration with guardrails**.

Try it: https://github.com/Jeronimo0228/StorePilot  
npm: `npx -y storepilot-mcp`

Early v1 — feedback welcome from mobile + MCP folks.

#MobileDev #MCP #AI #AppStore #GooglePlay #DevTools

---

## What NOT to claim

- ❌ “Replaces Fastlane”
- ❌ “#1 MCP” / “wins on every dimension”
- ❌ “Zero setup” (credentials are required)
- ❌ Same product as `silviosotelo/mobile-release-mcp`

## Differentiation one-liner

> **StorePilot is the only unified App Store + Play MCP with release snapshot, blocker analysis, and dry-run intents — not just 100 disconnected API wrappers.**

## Media checklist (optional)

| Asset | Spec |
|---|---|
| Terminal recording | Run `npm run demo` and screen-record 30–60s (OBS, asciinema, etc.) |
| Screenshots | JSON output from snapshot + dry-run intent |

No pre-built video is shipped in the repo — record when you're ready to post.

## After posting

- Reply to comments with link to `docs/CREDENTIALS.md`
- Track GitHub issues tagged `try-storepilot`
- Pin comment with distinction vs silviosotelo repo
