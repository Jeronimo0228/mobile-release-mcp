# StorePilot terminal demo — generates docs/assets/storepilot-demo.gif
# Requires: vhs, env vars (APPLE_*, STOREPILOT_CONFIG_PATH, optional GOOGLE_*)
# Run: npm run record:demo  (from repo root with credentials exported)

Output docs/assets/storepilot-demo.gif

Set Shell bash
Set FontSize 16
Set Width 1280
Set Height 720
Set Padding 40
Set Theme "Catppuccin Mocha"
Set TypingSpeed 12ms
Set PlaybackSpeed 1.25

Type "# StorePilot — can we ship to App Store + Play?"
Sleep 800ms
Enter
Sleep 400ms

Type "npm run demo"
Sleep 500ms
Enter
Sleep 20s

Type "# dry-run rollout — no production writes"
Sleep 600ms
Enter
Sleep 300ms

Type "✓ snapshot · blockers · intent plan"
Sleep 2s
