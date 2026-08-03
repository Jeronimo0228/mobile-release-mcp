import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadProjectProfile,
  loadProjectMemory,
  saveProjectMemory,
  resolveStoreIds,
} from "../src/core/project-profile.js";

describe("project-profile", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "storepilot-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses storepilot.yaml with ios and android stores", () => {
    const configPath = join(tempDir, "storepilot.yaml");
    writeFileSync(
      configPath,
      `
project: demo-app
name: Demo
stores:
  ios:
    appId: "123"
    bundleId: com.demo.app
  android:
    package: com.demo.app
release:
  defaultRollout: 0.2
  tracks:
    production: production
locales:
  - en-US
`,
      "utf-8",
    );

    const profile = loadProjectProfile(configPath);
    assert.equal(profile?.project, "demo-app");
    assert.equal(profile?.stores?.ios?.appId, "123");
    assert.equal(profile?.stores?.android?.package, "com.demo.app");
    assert.equal(profile?.release?.defaultRollout, 0.2);
    assert.deepEqual(profile?.locales, ["en-US"]);
  });

  it("persists and reloads project memory", () => {
    const configPath = join(tempDir, "storepilot.yaml");
    writeFileSync(
      configPath,
      "project: demo\nstores:\n  ios:\n    appId: '1'\n",
      "utf-8",
    );
    const profile = loadProjectProfile(configPath)!;

    saveProjectMemory(profile, {
      projectId: "demo",
      lastUpdated: new Date().toISOString(),
      resolved: { lastProductionIos: { version: "1.0.0" } },
      history: [],
    });

    const memory = loadProjectMemory(profile);
    assert.equal(memory.resolved.lastProductionIos?.version, "1.0.0");
  });

  it("resolveStoreIds prefers overrides over profile", () => {
    const ids = resolveStoreIds(
      {
        project: "x",
        stores: { ios: { appId: "from-profile" }, android: { package: "com.from" } },
      },
      { appleAppId: "override", googlePackageName: "com.override" },
    );
    assert.equal(ids.appleAppId, "override");
    assert.equal(ids.googlePackageName, "com.override");
  });
});
