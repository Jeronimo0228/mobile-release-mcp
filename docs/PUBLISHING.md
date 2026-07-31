# Publishing to npm

## Trusted publisher (recommended)

This project uses **npm trusted publishing** via GitHub Actions. No npm tokens in the repository.

### Release a new version

```bash
# 1. Bump version in package.json and CHANGELOG.md
# 2. Commit and push
git add package.json CHANGELOG.md src/server.ts
git commit -m "Release v0.2.1"
git push origin master

# 3. Tag and push (triggers release.yml)
git tag v0.2.1
git push origin v0.2.1
```

The `release.yml` workflow:

- Runs typecheck + tests + build
- Publishes with `npm publish --provenance --access public`
- Uses OIDC (trusted publisher) — no `NPM_TOKEN` secret

Verify on npm: package page should show **Provenance** badge.

### npm trusted publisher setup (one-time)

npm → `mobile-release-mcp` → Settings → **Trusted Publisher**:

| Field | Value |
|---|---|
| Repository | `Jeronimo0228/mobile-release-mcp` |
| Workflow | `release.yml` |
| Environment | (empty or `npm`) |

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
npx -y mobile-release-mcp@0.2.1
```

Verify provenance on https://www.npmjs.com/package/mobile-release-mcp
