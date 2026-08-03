import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("listAppStoreVersions", () => {
  it("does not send sort parameter to Apple API", async () => {
    const captured: Array<Record<string, string> | undefined> = [];
    const client = {
      get: async (_path: string, params?: Record<string, string>) => {
        captured.push(params);
        return { data: [] };
      },
    };

    const { listAppStoreVersions } = await import("../src/providers/apple/versions.js");
    await listAppStoreVersions(client as never, "app-123");

    assert.equal(captured.length, 1);
    assert.ok(captured[0]);
    assert.equal(captured[0]?.sort, undefined);
    assert.match(captured[0]?.["fields[appStoreVersions]"] ?? "", /versionString/);
  });
});

describe("withOptionalEdit", () => {
  it("reuses provided editId without creating a new edit", async () => {
    const { withOptionalEdit } = await import("../src/providers/google/edits.js");
    let created = 0;
    const client = {
      withEdit: async (_pkg: string, fn: (editId: string) => Promise<string>) => {
        created++;
        return fn("temp-edit");
      },
    };

    const editId = await withOptionalEdit(
      client as never,
      "com.example.app",
      "existing-edit",
      async (id) => id,
    );

    assert.equal(editId, "existing-edit");
    assert.equal(created, 0);
  });

  it("creates temporary edit when editId is omitted", async () => {
    const { withOptionalEdit } = await import("../src/providers/google/edits.js");
    let created = 0;
    const client = {
      withEdit: async (_pkg: string, fn: (editId: string) => Promise<string>) => {
        created++;
        return fn("temp-edit");
      },
    };

    const editId = await withOptionalEdit(
      client as never,
      "com.example.app",
      undefined,
      async (id) => id,
    );

    assert.equal(editId, "temp-edit");
    assert.equal(created, 1);
  });
});

describe("listDevices", () => {
  it("does not send sort parameter to Apple API", async () => {
    const captured: Array<Record<string, string> | undefined> = [];
    const client = {
      get: async (_path: string, params?: Record<string, string>) => {
        captured.push(params);
        return { data: [] };
      },
    };

    const { listDevices } = await import("../src/providers/apple/devices.js");
    await listDevices(client as never);

    assert.equal(captured.length, 1);
    assert.equal(captured[0]?.sort, undefined);
  });
});

describe("listCertificates", () => {
  it("does not send sort parameter to Apple API", async () => {
    const captured: Array<Record<string, string> | undefined> = [];
    const client = {
      get: async (_path: string, params?: Record<string, string>) => {
        captured.push(params);
        return { data: [] };
      },
    };

    const { listCertificates } = await import("../src/providers/apple/certificates.js");
    await listCertificates(client as never);

    assert.equal(captured.length, 1);
    assert.equal(captured[0]?.sort, undefined);
  });
});

describe("listInAppPurchases", () => {
  it("does not send invalid sort or referenceName field", async () => {
    const captured: Array<Record<string, string> | undefined> = [];
    const client = {
      get: async (_path: string, params?: Record<string, string>) => {
        captured.push(params);
        return { data: [] };
      },
    };

    const { listInAppPurchases } = await import("../src/providers/apple/iap.js");
    await listInAppPurchases(client as never, "app-123");

    assert.equal(captured.length, 1);
    assert.equal(captured[0]?.sort, undefined);
    assert.doesNotMatch(captured[0]?.["fields[inAppPurchases]"] ?? "", /referenceName/);
  });
});
