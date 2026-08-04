# Publishing to npm

## Trusted publisher (recommended)

This project uses **npm trusted publishing** via GitHub Actions. No npm tokens in the repository.

### Release a new version

```bash
# 1. Bump version in package.json and CHANGELOG.md
# 2. Commit and push
git add package.json CHANGELOG.md src/server.ts
git commit -m "Release v1.1.0"
git push origin master

# 3. Tag and push (triggers release.yml)
git tag v1.1.0
git push origin v1.1.0
```

The `release.yml` workflow:

- Runs typecheck + tests + build
- Publishes with `npm publish --provenance --access public`
- Uses OIDC (trusted publisher) — no `NPM_TOKEN` secret

Verify on npm: package page should show **Provenance** badge.

### npm trusted publisher setup (one-time)

npm → **`storepilot-mcp`** → Settings → **Trusted Publisher**:

| Field | Value |
|---|---|
| Repository | `Jeronimo0228/StorePilot` |
| Workflow | `release.yml` |
| Environment | (empty or `npm`) |

> **Migration from `mobile-release-mcp`:** After publishing `storepilot-mcp@1.1.0`, deprecate the old package:
>
> ```bash
> npm deprecate mobile-release-mcp "Renamed to storepilot-mcp — use npx storepilot-mcp@latest"
> ```
>
> Update the trusted publisher on the **new** package (`storepilot-mcp`). The old package publisher can remain for deprecation only.

---

## Dry run (local)

```bash
npm run prepublishOnly
npm pack --dry-run
```

---

## Manual publish (emergency only)

Avoid manual publishes when trusted publisher is configured. If needed:

```bash
npm login
npm publish --provenance --access public
```

Rotate any token used for manual publish afterward.

---

## Consumer install

```bash
npx -y storepilot-mcp@1.1.0
```

Verify provenance on https://www.npmjs.com/package/storepilot-mcp

Legacy alias (deprecated): `mobile-release-mcp` bin still ships until v2.0 for existing MCP configs.
